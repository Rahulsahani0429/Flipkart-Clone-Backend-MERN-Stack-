import mongoose from "mongoose";

const paymentLogSchema = mongoose.Schema(
    {
        event: {
            type: String,
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        payload: {
            type: Object,
            required: true,
        },
        status: {
            type: String,
            enum: ["PROCESSED", "FAILED", "DUPLICATE"],
            default: "PROCESSED",
        },
        error: String,
        createdAt: {
            type: Date,
            default: Date.now,
            index: { expires: "365d" }, // RAZORPAY_EVENT_RETENTION_DAYS=365
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate event processing if webhook_event_id is stored
paymentLogSchema.index({ "payload.event_id": 1 }, { unique: true, sparse: true });

const PaymentLog = mongoose.model("PaymentLog", paymentLogSchema);

export default PaymentLog;
