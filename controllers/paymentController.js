import crypto from "crypto";
import razorpay from "../utils/razorpay.js";
import Order from "../models/Order.js";
import PaymentLog from "../models/PaymentLog.js";
import { createNotification, sendUserNotification } from "../services/notificationService.js";
import { getIO } from "../socket.js";

/**
 * @desc    Create Razorpay Order
 * @route   POST /api/payments/create-order
 * @access  Private
 */
export const createRazorpayOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Amount validation (security rule: do not trust frontend)
        const amount = Math.round(order.totalPrice * 100); // Razorpay expects amount in paise

        const options = {
            amount,
            currency: "INR",
            receipt: `receipt_order_${order._id}`,
        };

        const razorpayOrder = await razorpay.orders.create(options);

        if (!razorpayOrder) {
            return res.status(500).json({ message: "Error creating Razorpay order" });
        }

        // Update order with razorpay_order_id
        order.razorpay_order_id = razorpayOrder.id;
        order.paymentStatus = "PENDING";
        await order.save();

        res.status(200).json(razorpayOrder);
    } catch (error) {
        console.error("Create Razorpay Order Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Verify Razorpay Payment
 * @route   POST /api/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            const order = await Order.findOne({ razorpay_order_id });

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            order.razorpay_payment_id = razorpay_payment_id;
            order.razorpay_signature = razorpay_signature;
            order.paymentStatus = "SUCCESS";
            order.isPaid = true;
            order.paidAt = Date.now();

            const updatedOrder = await order.save();

            // Emit socket update
            const io = getIO();
            if (io) {
                io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
                io.to("adminRoom").emit("orderUpdated", updatedOrder);
            }

            // Notify User
            await sendUserNotification(order.user, "PAYMENT_SUCCESS", {
                orderId: order._id,
                amount: order.totalPrice,
            });

            res.status(200).json({
                message: "Payment verified successfully",
                order: updatedOrder,
            });
        } else {
            // If signature is invalid, set status to FAILED
            const order = await Order.findOne({ razorpay_order_id });
            if (order) {
                order.paymentStatus = "FAILED";
                await order.save();
            }

            res.status(400).json({ message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Verify Payment Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Razorpay Webhook Handler
 * @route   POST /api/payments/webhook
 * @access  Public
 */
export const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];

        if (!signature) {
            return res.status(400).json({ message: "Missing signature" });
        }

        const isValid = razorpay.webhooks.verifySignature(
            JSON.stringify(req.body),
            signature,
            process.env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!isValid) {
            if (process.env.RAZORPAY_WEBHOOK_DEBUG === "1") {
                console.log("Invalid Webhook Signature");
            }
            return res.status(400).json({ message: "Invalid webhook signature" });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (process.env.RAZORPAY_WEBHOOK_DEBUG === "1") {
            console.log(`Razorpay Webhook Received: ${event}`);
        }

        // Handle Idempotency (Reject duplicate events)
        const existingLog = await PaymentLog.findOne({ "payload.event_id": req.body.event_id });
        if (existingLog) {
            return res.status(200).json({ message: "Event already processed" });
        }

        let order;
        const razorpayOrderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;

        if (razorpayOrderId) {
            order = await Order.findOne({ razorpay_order_id: razorpayOrderId });
        }

        // Log the event
        const log = new PaymentLog({
            event,
            orderId: order?._id,
            razorpayOrderId,
            razorpayPaymentId: payload.payment?.entity?.id,
            payload: req.body,
        });

        switch (event) {
            case "payment.captured":
                if (order && order.paymentStatus !== "SUCCESS") {
                    order.paymentStatus = "SUCCESS";
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.razorpay_payment_id = payload.payment.entity.id;
                    await order.save();

                    // Notify User
                    await sendUserNotification(order.user, "PAYMENT_SUCCESS", {
                        orderId: order._id,
                        amount: order.totalPrice,
                    });
                }
                break;

            case "payment.failed":
                if (order && order.paymentStatus !== "SUCCESS") {
                    order.paymentStatus = "FAILED";
                    await order.save();
                }
                break;

            case "refund.processed":
                if (order) {
                    order.paymentStatus = "REFUNDED";
                    order.refund_id = payload.refund.entity.id;
                    await order.save();
                }
                break;

            default:
                if (process.env.RAZORPAY_WEBHOOK_DEBUG === "1") {
                    console.log(`Unhandled Razorpay Event: ${event}`);
                }
        }

        await log.save();

        res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get Payment Details (Admin)
 * @route   GET /api/admin/payments/:id
 * @access  Private/Admin
 */
export const getPaymentDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("user", "name email avatar");
        if (!order) {
            return res.status(404).json({ message: "Payment/Order not found" });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update Payment (Admin)
 * @route   PUT /api/admin/payments/:id
 * @access  Private/Admin
 */
export const updatePayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Payment/Order not found" });
        }

        order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
        order.paymentNotes = req.body.paymentNotes || order.paymentNotes;

        if (req.body.isPaid !== undefined) {
            order.isPaid = req.body.isPaid;
            if (order.isPaid && !order.paidAt) {
                order.paidAt = Date.now();
            }
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Generate Receipt (Admin)
 * @route   GET /api/admin/payments/:id/receipt
 * @access  Private/Admin
 */
export const generateReceipt = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Payment/Order not found" });
        }
        // Basic response, in a real app this might return a PDF stream
        res.json({ message: "Receipt request received", orderId: order._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Send Receipt (Admin)
 * @route   POST /api/admin/payments/:id/send-receipt
 * @access  Private/Admin
 */
export const sendReceipt = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Payment/Order not found" });
        }

        order.receiptSent = true;
        order.receiptSentAt = Date.now();
        await order.save();

        res.json({ message: "Receipt marked as sent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Refund Payment (Admin)
 * @route   POST /api/admin/payments/:id/refund
 * @access  Private/Admin
 */
export const refundPayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Payment/Order not found" });
        }

        if (order.paymentMethod === "Razorpay" && order.razorpay_payment_id) {
            // Initiate Razorpay Refund
            const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
                amount: Math.round(order.totalPrice * 100),
                notes: { reason: "Admin initiated refund" }
            });

            order.paymentStatus = "REFUNDED";
            order.refund_id = refund.id;
            await order.save();

            return res.json({ message: "Razorpay refund initiated", refund });
        }

        order.paymentStatus = "REFUNDED";
        await order.save();

        await sendUserNotification(order.user, "REFUND_PROCESSED", {
            orderId: order._id,
            amount: order.totalPrice,
        });

        res.json({ message: "Payment status updated to REFUNDED" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete Payment Entry (Admin)
 * @route   DELETE /api/admin/payments/:id
 * @access  Private/Admin
 */
export const deletePayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Payment/Order not found" });
        }

        // We don't delete the order, just clear payment info or handle specific delete logic
        order.paymentStatus = "PENDING";
        order.isPaid = false;
        order.paidAt = undefined;
        order.razorpay_payment_id = undefined;
        order.razorpay_order_id = undefined;
        order.razorpay_signature = undefined;

        await order.save();
        res.json({ message: "Payment info cleared" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
