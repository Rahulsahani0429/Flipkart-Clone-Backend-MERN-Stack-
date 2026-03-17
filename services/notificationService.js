import mongoose from "mongoose";
import { getIO } from "../socket.js";
import { sendEmail } from "./emailService.js";
import EmailLog from "../models/EmailLog.js";
import User from "../models/User.js";

/**
 * @desc    Create and emit a notification
 */
export const createNotification = async ({ type, title, message, meta, recipient, role, relatedId }) => {
    try {
        const db = mongoose.connection.db;

        const notification = {
            type,
            title,
            message,
            meta: meta || {},
            recipient: recipient ? new mongoose.Types.ObjectId(recipient) : null,
            role: role || "admin",
            relatedId: relatedId ? new mongoose.Types.ObjectId(relatedId) : null,
            isRead: false,
            createdAt: new Date()
        };

        const result = await db.collection("notifications").insertOne(notification);
        const createdNotification = { ...notification, _id: result.insertedId };

        // Emit to the specific recipient if provided
        const io = getIO();
        if (recipient) {
            io.to(recipient.toString()).emit("notification:new", createdNotification);
        } else if (role === "admin") {
            io.to("admins").emit("notification:new", createdNotification);
        } else {
            io.emit("notification:new", createdNotification); // Broadcast
        }

        return createdNotification;
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

/**
 * @desc    Send both In-app and Email Notification
 */
export const sendUserNotification = async (userId, type, payload) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`User ${userId} not found for notification`);
            return;
        }

        const { amount, orderId, productName } = payload;

        // 1. Create In-app Notification
        await createNotification({
            recipient: userId,
            role: "user",
            title: getTitleByType(type),
            message: getMessageByType(type, payload),
            type: type,
            relatedId: orderId,
            meta: {
                ...payload,
                redirectUrl: `/orders/${orderId}`
            }
        });

        // 2. Send Email
        const emailResult = await sendEmail(user.email, type, {
            name: user.name,
            amount,
            orderId,
            productName,
        });

        // 3. Log Email
        const log = new EmailLog({
            userId,
            email: user.email,
            eventType: type,
            status: emailResult.success ? "SENT" : "FAILED",
            error: emailResult.error,
        });
        await log.save();

        return { success: true };
    } catch (error) {
        console.error("sendUserNotification Error:", error);
    }
};

/**
 * @desc Helper to get Title
 */
const getTitleByType = (type) => {
    switch (type) {
        case "ORDER_PLACED": return "Order Placed Successfully";
        case "ORDER_CANCELLED": return "Order Cancelled";
        case "ORDER_DELIVERED": return "Order Delivered";
        case "PAYMENT_SUCCESS": return "Payment Successful";
        case "PAYMENT_FAILED": return "Payment Failed";
        case "ORDER_SHIPPED": return "Order Shipped";
        case "RETURN_APPROVED": return "Return Approved";
        default: return "Account Update";
    }
};

/**
 * @desc Helper to get Message
 */
const getMessageByType = (type, data) => {
    const { orderId, amount } = data;
    switch (type) {
        case "ORDER_PLACED": return `Your order #${orderId} for $${amount} has been placed.`;
        case "ORDER_CANCELLED": return `Your order #${orderId} has been cancelled.`;
        case "ORDER_DELIVERED": return `Great news! Your order #${orderId} has been delivered.`;
        case "PAYMENT_SUCCESS": return `Payment for order #${orderId} was successful.`;
        case "PAYMENT_FAILED": return `Payment for order #${orderId} failed. Please try again.`;
        case "ORDER_SHIPPED": return `Your order #${orderId} is out for shipping.`;
        case "RETURN_APPROVED": return `Your return request for order #${orderId} was approved.`;
        default: return "There is an update on your account.";
    }
};
