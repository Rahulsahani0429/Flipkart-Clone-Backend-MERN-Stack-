// import Order from '../models/Order.js';

// // @desc    Create new order
// // @route   POST /api/orders
// // @access  Private
// const addOrderItems = async (req, res) => {
//     try {
//         const {
//             orderItems,
//             shippingAddress,
//             paymentMethod,
//             itemsPrice,
//             taxPrice,
//             shippingPrice,
//             totalPrice,
//         } = req.body;

//         if (orderItems && orderItems.length === 0) {
//             res.status(400).json({ message: 'No order items' });
//             return;
//         } else {
//             const order = new Order({
//                 orderItems: orderItems.map((x) => ({
//                     ...x,
//                     product: x.product,
//                     _id: undefined,
//                 })),
//                 user: req.user._id,
//                 shippingAddress,
//                 paymentMethod,
//                 itemsPrice,
//                 taxPrice,
//                 shippingPrice,
//                 totalPrice,
//             });

//             const createdOrder = await order.save();

//             res.status(201).json(createdOrder);
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Get order by ID
// // @route   GET /api/orders/:id
// // @access  Private
// const getOrderById = async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.id).populate(
//             'user',
//             'name email'
//         );

//         if (order) {
//             res.json(order);
//         } else {
//             res.status(404).json({ message: 'Order not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Update order to paid
// // @route   PUT /api/orders/:id/pay
// // @access  Private
// const updateOrderToPaid = async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.id);

//         if (order) {
//             order.isPaid = true;
//             order.paidAt = Date.now();
//             order.paymentResult = {
//                 id: req.body.id,
//                 status: req.body.status,
//                 update_time: req.body.update_time,
//                 email_address: req.body.payer.email_address,
//             };

//             const updatedOrder = await order.save();

//             res.json(updatedOrder);
//         } else {
//             res.status(404).json({ message: 'Order not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Update order to delivered
// // @route   PUT /api/orders/:id/deliver
// // @access  Private/Admin
// const updateOrderToDelivered = async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.id);

//         if (order) {
//             order.isDelivered = true;
//             order.deliveredAt = Date.now();

//             const updatedOrder = await order.save();

//             res.json(updatedOrder);
//         } else {
//             res.status(404).json({ message: 'Order not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Get logged in user orders
// // @route   GET /api/orders/myorders
// // @access  Private
// const getMyOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({ user: req.user._id });
//         res.json(orders);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // @desc    Get all orders
// // @route   GET /api/orders
// // @access  Private/Admin
// const getOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({}).populate('user', 'id name');
//         res.json(orders);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// export {
//     addOrderItems,
//     getOrderById,
//     updateOrderToPaid,
//     updateOrderToDelivered,
//     getMyOrders,
//     getOrders,
// };

import Order from "../models/Order.js";
import PDFDocument from "pdfkit";
import User from "../models/User.js";
import { createNotification, sendUserNotification } from "../services/notificationService.js";
import { getIO } from "../socket.js";
import { syncShipmentData } from "./shipmentController.js";

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
const addOrderItems = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    // 1️⃣ Validate order items
    // we can also write as

    if (!orderItems) {
      return res.status(400).json({ message: "No order items provided" });
    }
    if (orderItems.length === 0) {
      return res
        .status(400)
        .json({ message: "No order items provided by you rahul" });
    }
    // this is second method
    // if (!orderItems || orderItems.length === 0) {
    //     return res.status(400).json({ message: "No order items provided" });
    // }

    //  first method
    // const formattedItems = orderItems.map(item => ({
    //     product: item.product,
    //     qty: item.qty,
    //     price: item.price,
    //     name: item.name,
    //     image: item.image,
    // }));

    // const order = new Order({
    //     orderItems: formattedItems,
    //     user: req.user._id,
    //     shippingAddress,
    //     paymentMethod,
    //     itemsPrice,
    //     taxPrice,
    //     shippingPrice,
    //     totalPrice,
    // });

    // second method
    // 2️⃣ Create order
    const order = new Order({
      orderItems: orderItems.map((item) => ({
        ...item,
        product: item.product,
        _id: undefined,
      })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    // 3️⃣ Save order
    // first method
    const createdOrder = await order.save();

    // Notify Admin of new order
    await createNotification({
      type: "order_created",
      title: "New Order Placed",
      message: `New order #${createdOrder._id} for $${createdOrder.totalPrice}`,
      meta: {
        orderId: createdOrder._id,
        amount: createdOrder.totalPrice,
        userId: req.user._id
      }
    });

    // Notify User via Email and In-app
    await sendUserNotification(req.user._id, "ORDER_PLACED", {
      orderId: createdOrder._id,
      amount: createdOrder.totalPrice
    });

    return res.status(201).json({
      message: "Order created successfully",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    // 🔍 Validate ID
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email avatar",
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify ownership or admin access
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: "Not authorized to view this order" });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("Get Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update order to paid
 * @route   PUT /api/orders/:id/pay
 * @access  Private
 */
const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isFailed = req.body.status === "failed";

    if (isFailed) {
      order.isPaid = false;
      order.paymentStatus = "FAILED";
      order.paymentResult = {
        id: req.body.id,
        status: "failed",
        update_time: req.body.update_time,
        email_address: req.body.payer?.email_address,
      };

      const updatedOrder = await order.save();

      // Notify User
      await createNotification({
        recipient: order.user,
        role: "user",
        title: "Payment Failed",
        message: "Your payment failed. Please retry.",
        type: "PAYMENT_FAILED",
        relatedId: order._id,
      });

      // Notify Admin
      await createNotification({
        type: "payment_updated",
        title: "Payment Failed",
        message: `Payment failed for Order #${order._id}.`,
        meta: {
          orderId: order._id,
          paymentStatus: "FAILED"
        }
      });

      return res.status(200).json({
        message: "Order payment failed",
        order: updatedOrder,
      });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentStatus = "SUCCESS";
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.payer?.email_address,
    };

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    // Notify User
    await createNotification({
      recipient: order.user,
      role: "user",
      title: "Payment Successful",
      message: "Your payment was successful. We are processing your order.",
      type: "PAYMENT_SUCCESS",
      relatedId: order._id,
    });

    // Notify Admin
    await createNotification({
      type: "payment_updated",
      title: "Payment Successful",
      message: `Order #${order._id} has been paid.`,
      meta: {
        orderId: order._id,
        paymentStatus: "SUCCESS",
        amount: order.totalPrice
      }
    });

    return res.status(200).json({
      message: "Order marked as paid",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Pay Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update order to delivered
 * @route   PUT /api/orders/:id/deliver
 * @access  Private/Admin
 */
const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.isDelivered = true;
    order.orderStatus = "DELIVERED";
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    // Notify User
    await createNotification({
      recipient: order.user,
      role: "user",
      title: "Order Delivered",
      message: `Your order #${order._id} has been delivered. Enjoy your purchase!`,
      type: "order",
      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Order marked as delivered",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Deliver Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get logged-in user orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("My Orders Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get all orders
 * @route   GET /api/orders
 * @access  Private/Admin
 */
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "id name email avatar");

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Get Orders Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Delete an order (Admin)
 * @route   DELETE /api/orders/:id
 * @access  Private/Admin
 */
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const orderId = order._id;
    const userId = order.user;

    await order.deleteOne();

    // Emit socket events
    try {
      const io = getIO();
      io.to("adminRoom").emit("orderDeleted", orderId);
      io.to(userId.toString()).emit("orderDeleted", orderId);
    } catch (err) {
      console.error("Socket emit error on delete:", err);
    }

    return res.status(200).json({
      message: "Order deleted successfully",
      id: orderId,
    });
  } catch (error) {
    console.error("Delete Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Cancel an order
 * @route   POST /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized to cancel this order" });
    }

    if (order.orderStatus === 'CANCELLED') {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    const stage = order.orderStatus;
    let canCancelImmediately = false;
    let needsRequest = false;

    if (stage === 'ORDER_CONFIRMED' || stage === 'PROCESSING') {
      canCancelImmediately = true;
    } else if (stage === 'SHIPPED' || stage === 'OUT_FOR_DELIVERY') {
      needsRequest = true;
    } else if (stage === 'DELIVERED') {
      const deliveredAt = order.deliveredAt;
      const hoursSinceDelivery = (Date.now() - new Date(deliveredAt)) / (1000 * 60 * 60);

      if (hoursSinceDelivery <= 24) {
        canCancelImmediately = true;
      } else {
        return res.status(400).json({ message: "Cancellation window closed. You can request a return instead." });
      }
    }

    if (canCancelImmediately) {
      order.orderStatus = 'CANCELLED';
      order.isCancelled = true;
      order.cancelledAt = Date.now();
      order.cancellationStatus = 'COMPLETED';

      // Refund logic
      if (order.paymentMethod !== 'COD' && order.isPaid) {
        order.refundStatus = 'PENDING';
      } else {
        order.refundStatus = 'NOT_REQUIRED';
      }
    } else if (needsRequest) {
      order.cancellationStatus = 'REQUESTED';
    }

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    // Notify User
    await sendUserNotification(order.user, canCancelImmediately ? "ORDER_CANCELLED" : "ORDER_CANCELLATION_REQUESTED", {
      orderId: order._id,
    });

    // Notify Admin
    await createNotification({
      role: "admin",
      title: canCancelImmediately ? "Order Cancelled" : "Cancellation Requested",
      message: canCancelImmediately ? `Order #${order._id} has been cancelled by the user.` : `User requested cancellation for Shipped Order #${order._id}.`,
      type: "order",
      relatedId: order._id,
    });

    return res.status(200).json({
      message: canCancelImmediately ? "Order cancelled successfully" : "Cancellation requested successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update order to processing
 * @route   PUT /api/orders/:id/process
 * @access  Private/Admin
 */
const updateOrderToProcessing = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.isProcessing = true;
    order.orderStatus = "PROCESSING";
    order.processedAt = Date.now();

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    return res.status(200).json({
      message: "Order marked as processing",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Process Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update order to shipped
 * @route   PUT /api/orders/:id/ship
 * @access  Private/Admin
 */
const updateOrderToShipped = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.isShipped = true;
    order.orderStatus = "SHIPPED";
    order.shippedAt = Date.now();

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    // Notify User
    await createNotification({
      recipient: order.user,
      role: "user",
      title: "Order Shipped",
      message: `Your order #${order._id} has been shipped. It will arrive soon!`,
      type: "order",
      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Order marked as shipped",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Ship Order Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// @desc    Update order status
// @route   PATCH /api/v1/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const statusEnum = ["ORDER_CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

    if (!statusEnum.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const currentIndex = statusEnum.indexOf(order.orderStatus);
    const newIndex = statusEnum.indexOf(status);

    if (newIndex <= currentIndex) {
      return res.status(400).json({ message: `Cannot move status back or stay the same. Current: ${order.orderStatus}` });
    }

    order.orderStatus = status;

    // Maintain backward compatibility with old flags
    if (status === "PROCESSING") {
      order.isProcessing = true;
      order.processedAt = Date.now();
    } else if (status === "SHIPPED") {
      order.isShipped = true;
      order.shippedAt = Date.now();
    } else if (status === "DELIVERED") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    // Sync Shipment Data
    const shipment = await syncShipmentData(order._id, status);

    // Notify Admin
    await createNotification({
      type: "order_status_changed",
      title: "Order Status Updated",
      message: `Order #${order._id} status changed to ${status}`,
      meta: {
        orderId: order._id,
        orderStatus: status
      }
    });

    // Notify User based on status
    if (status === "SHIPPED") {
      await sendUserNotification(order.user, "ORDER_SHIPPED", { orderId: order._id });
    } else if (status === "DELIVERED") {
      await sendUserNotification(order.user, "ORDER_DELIVERED", { orderId: order._id });
    }

    // Emit shipment update event if shipment exists
    if (shipment) {
      io.to(`shipment_${order._id}`).emit("shipmentUpdated", shipment);
      // Also notify user room for general awareness if needed
      io.to(order.user.toString()).emit("shipmentUpdated", shipment);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order payment status
// @route   PATCH /api/v1/admin/orders/:id/payment
// @access  Private/Admin
const updateOrderPayment = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["PENDING", "SUCCESS", "FAILED", "REFUNDED"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === "SUCCESS") {
      order.isPaid = true;
      order.paidAt = Date.now();
    } else {
      order.isPaid = false;
      order.paidAt = null;
    }

    const updatedOrder = await order.save();

    // Emit socket event
    const io = getIO();
    io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
    io.to("adminRoom").emit("orderUpdated", updatedOrder);

    // Notify Admin
    await createNotification({
      type: "payment_updated",
      title: "Payment Status Updated",
      message: `Order #${order._id} payment status changed to ${paymentStatus}`,
      meta: {
        orderId: order._id,
        paymentStatus: paymentStatus
      }
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Generate invoice PDF
 * @route   GET /api/orders/:id/invoice
 * @access  Private/Admin
 */
const generateInvoice = async (req, res) => {
  console.log(`[DEBUG] generateInvoice called for order: ${req.params.id}`);
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    console.log(`[DEBUG] Order found: ${!!order}`);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check ownership or admin status
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: "Not authorized to download this invoice" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    let filename = `Invoice-${order._id}.pdf`;

    // Strip special characters from filename
    filename = encodeURIComponent(filename);

    res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-type", "application/pdf");

    doc.pipe(res);

    // --- HEADER SECTION ---
    // Left: Company Info
    doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(24).text("ProfitPulse E-commerce", 40, 40);
    doc.font("Helvetica").fontSize(10).fillColor("#555555");
    doc.text("123 Tech Avenue, Silicon Valley", 40, 70);
    doc.text("California, USA, 94000", 40, 85);
    doc.text("Support: support@profitpulse.com", 40, 100);

    // Right: Invoice Metadata (strictly aligned to right edge)
    const rightSideAlign = 400;
    doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(28).text("INVOICE", rightSideAlign, 40, { align: "right", width: 155 });

    doc.fontSize(10).font("Helvetica").fillColor("#555555");
    const metaY = 80;
    doc.font("Helvetica-Bold").text("Invoice #:", rightSideAlign, metaY, { align: "right", width: 70 });
    doc.font("Helvetica").text(`${order._id}`, rightSideAlign + 75, metaY, { align: "right", width: 80 });

    doc.font("Helvetica-Bold").text("Invoice Date:", rightSideAlign, metaY + 15, { align: "right", width: 70 });
    doc.font("Helvetica").text(`${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, rightSideAlign + 75, metaY + 15, { align: "right", width: 80 });

    doc.font("Helvetica-Bold").text("Order Date:", rightSideAlign, metaY + 30, { align: "right", width: 70 });
    doc.font("Helvetica").text(`${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, rightSideAlign + 75, metaY + 30, { align: "right", width: 80 });

    doc.moveDown(4);

    // --- CUSTOMER & SUMMARY SECTION ---
    const sectionTop = 160;
    // Left: Bill To
    doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(12).text("Bill To:", 40, sectionTop);
    doc.font("Helvetica").fontSize(10).fillColor("#333333");
    doc.text(order.user?.name || "Customer", 40, sectionTop + 18);
    doc.text(order.user?.email || "N/A", 40, sectionTop + 33);
    doc.text(`${order.shippingAddress.address}`, 40, sectionTop + 48);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`, 40, sectionTop + 63);
    doc.text(`${order.shippingAddress.country}`, 40, sectionTop + 78);

    // Right: Order Summary
    doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(12).text("Order Summary:", rightSideAlign, sectionTop, { align: "right", width: 155 });
    doc.font("Helvetica").fontSize(10).fillColor("#333333");
    doc.text(`Payment Method: ${order.paymentMethod}`, rightSideAlign, sectionTop + 18, { align: "right", width: 155 });

    doc.text("Status: ", rightSideAlign, sectionTop + 33, { continued: true, align: "right", width: 155 });
    const isPaid = order.paymentStatus === "PAID" || order.isPaid;
    doc.fillColor(isPaid ? "#27ae60" : "#e74c3c").font("Helvetica-Bold")
      .text(order.paymentStatus || (order.isPaid ? 'PAID' : 'NOT_PAID'), { align: "right" });

    if (isPaid && order.paidAt) {
      doc.fillColor("#333333").font("Helvetica")
        .text(`Paid On: ${new Date(order.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, rightSideAlign, sectionTop + 48, { align: "right", width: 155 });
    }

    doc.moveDown(4);

    // --- ITEMS TABLE ---
    const tableTop = 280;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1a1a1a");

    // Table Headers
    doc.text("Item Description", 40, tableTop);
    doc.text("Qty", 320, tableTop, { width: 30, align: "center" });
    doc.text("Unit Price", 370, tableTop, { width: 80, align: "right" });
    doc.text("Subtotal", 475, tableTop, { width: 80, align: "right" });

    // Header Border
    doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).lineWidth(1).strokeColor("#eeeeee").stroke();

    // Table Rows
    let y = tableTop + 25;
    doc.font("Helvetica").fillColor("#333333");
    order.orderItems.forEach((item) => {
      // Handle multiline name if needed
      const name = item.name.length > 50 ? item.name.substring(0, 47) + "..." : item.name;
      doc.text(name, 40, y, { width: 270 });
      doc.text(item.qty.toString(), 320, y, { width: 30, align: "center" });
      doc.text(`$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 370, y, { width: 80, align: "right" });
      doc.text(`$${(item.qty * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 475, y, { width: 80, align: "right" });
      y += 20;
    });

    // Sub-table border
    doc.moveTo(40, y).lineTo(555, y).lineWidth(1).strokeColor("#eeeeee").stroke();
    y += 15;

    // --- TOTALS SECTION ---
    const totalLabelX = 370;
    const totalValX = 475;

    doc.font("Helvetica").fontSize(10).fillColor("#555555");

    doc.text("Items Total:", totalLabelX, y, { width: 80, align: "right" });
    doc.text(`$${order.itemsPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalValX, y, { width: 80, align: "right" });

    y += 18;
    doc.text("Shipping Fee:", totalLabelX, y, { width: 80, align: "right" });
    doc.text(order.shippingPrice === 0 ? "FREE" : `$${order.shippingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalValX, y, { width: 80, align: "right" });

    y += 18;
    doc.text("Tax:", totalLabelX, y, { width: 80, align: "right" });
    doc.text(`$${order.taxPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalValX, y, { width: 80, align: "right" });

    if (order.discount > 0) {
      y += 18;
      doc.fillColor("#e74c3c").text("Discount:", totalLabelX, y, { width: 80, align: "right" });
      doc.text(`-$${order.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalValX, y, { width: 80, align: "right" });
      doc.fillColor("#555555");
    }

    y += 22;
    // Final Total Border
    doc.moveTo(totalLabelX - 20, y - 5).lineTo(555, y - 5).lineWidth(0.5).strokeColor("#1a1a1a").stroke();

    doc.font("Helvetica-Bold").fontSize(14).fillColor("#1a1a1a");
    doc.text("Final Total:", totalLabelX - 50, y, { width: 130, align: "right" });
    doc.text(`$${order.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalValX, y, { width: 80, align: "right" });

    // --- FOOTER SECTION ---
    doc.fontSize(10).font("Helvetica-Oblique").fillColor("#777777");
    doc.text("Thank you for choosing ProfitPulse! We appreciate your business.", 40, 750, { align: "center", width: 515 });
    doc.fontSize(8).font("Helvetica").text("This is a computer generated invoice and does not require a signature.", 40, 765, { align: "center", width: 515 });

    doc.end();
  } catch (error) {
    console.error("Generate Invoice Error:", error);
    res.status(500).json({ message: "Error generating invoice" });
  }
};

/**
 * @desc    Send payment reminder
 * @route   POST /api/orders/:id/reminder
 * @access  Private/Admin
 */
const sendPaymentReminder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Mocking email sending for now
    console.log(`[MOCK EMAIL] To: ${order.user?.email || 'N/A'}, Subject: Payment Reminder for Order #${order._id}`);

    // Create a notification for the user
    if (order.user) {
      await createNotification({
        recipient: order.user._id,
        role: "user",
        title: "Payment Reminder",
        message: `Friendly reminder to complete payment for your order #${order._id}.`,
        type: "order",
        relatedId: order._id,
      });
    }

    return res.status(200).json({ message: "Payment reminder sent successfully" });
  } catch (error) {
    console.error("Send Reminder Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Request order return
 * @route   POST /api/orders/:id/return
 * @access  Private
 */
const requestOrderReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized to return this order" });
    }

    // Validate eligibility
    if (!order.isDelivered) {
      return res.status(400).json({ message: "Cannot return an undelivered order" });
    }

    const returnWindowDays = 10;
    const deliveryDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > returnWindowDays) {
      return res.status(400).json({ message: "Return window has expired (Allowed: 10 days)" });
    }

    if (order.returnStatus !== "NONE") {
      return res.status(400).json({ message: "Return already requested for this order" });
    }

    order.returnStatus = "REQUESTED";
    order.returnReason = reason;
    order.returnRequestedAt = Date.now();

    const updatedOrder = await order.save();

    // Notify Admin
    await createNotification({
      role: "admin",
      title: "Return Requested",
      message: `Return requested for Order #${order._id}. Reason: ${reason}`,
      type: "RETURN_REQUESTED",
      relatedId: order._id,
    });

    // Notify User
    await sendUserNotification(order.user, "RETURN_REQUESTED", {
      orderId: order._id,
    });

    // Emit socket
    try {
      const io = getIO();
      io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
      io.to("adminRoom").emit("orderUpdated", updatedOrder);
    } catch (err) {
      console.error("Socket error in return request:", err);
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Return Request Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update return status
 * @route   PUT /api/orders/:id/return-status
 * @access  Private/Admin
 */
const updateReturnStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["NONE", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED"].includes(status)) {
      return res.status(400).json({ message: "Invalid return status" });
    }

    order.returnStatus = status;
    const updatedOrder = await order.save();

    // Notify User
    let message = `Your return request for Order #${order._id} has been ${status.toLowerCase()}.`;
    if (status === "APPROVED") message = `Your return request for Order #${order._id} is approved. Pickup scheduled.`;
    if (status === "COMPLETED") message = `Return for Order #${order._id} completed. Refund processed.`;

    // Notify User
    if (status === "APPROVED") {
      await sendUserNotification(order.user, "RETURN_APPROVED", { orderId: order._id });
    } else {
      await createNotification({
        recipient: order.user,
        role: "user",
        title: "Return Status Updated",
        message: message,
        type: "RETURN_STATUS_UPDATED",
        relatedId: order._id,
      });
    }

    // Emit socket
    try {
      const io = getIO();
      io.to(order.user.toString()).emit("orderUpdated", updatedOrder);
      io.to("adminRoom").emit("orderUpdated", updatedOrder);
    } catch (err) {
      console.error("Socket error in update return status:", err);
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Update Return Status Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderToProcessing,
  updateOrderToShipped,
  updateOrderStatus,
  updateOrderPayment,
  getMyOrders,
  getOrders,
  deleteOrder,
  cancelOrder,
  generateInvoice,
  sendPaymentReminder,
  requestOrderReturn,
  updateReturnStatus,
};
