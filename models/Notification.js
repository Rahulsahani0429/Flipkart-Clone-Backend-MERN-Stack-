import mongoose from "mongoose";

const notificationSchema = mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // Optional if it's for all admins or role-based
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["order", "payment", "stock", "system", "PAYMENT_FAILED", "PAYMENT_SUCCESS", "PAYMENT_REFUNDED", "RECEIPT_SENT", "RETURN_REQUESTED", "RETURN_STATUS_UPDATED"],
            required: true,
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
        isRead: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
