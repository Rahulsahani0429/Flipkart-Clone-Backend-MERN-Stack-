import mongoose from "mongoose";

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        seller: { type: String, default: "Squid-Game Shop" },
        properties: {
          color: { type: String },
          ram: { type: String },
          storage: { type: String },
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    discount: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    isProcessing: {
      type: Boolean,
      required: true,
      default: false,
    },
    processedAt: {
      type: Date,
    },
    isShipped: {
      type: Boolean,
      required: true,
      default: false,
    },
    shippedAt: {
      type: Date,
    },
    isCancelled: {
      type: Boolean,
      required: true,
      default: false,
    },
    cancelledAt: {
      type: Date,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["ORDER_CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "ORDER_CONFIRMED",
    },
    cancellationStatus: {
      type: String,
      required: true,
      enum: ["NONE", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
      default: "NONE",
    },
    refundStatus: {
      type: String,
      required: true,
      enum: ["NOT_REQUIRED", "PENDING", "COMPLETED"],
      default: "NOT_REQUIRED",
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    paymentNotes: {
      type: String,
      default: "",
    },
    receiptSent: {
      type: Boolean,
      default: false,
    },
    receiptSentAt: {
      type: Date,
    },
    returnStatus: {
      type: String,
      required: true,
      enum: ["NONE", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
      default: "NONE",
    },
    returnReason: {
      type: String,
    },
    returnRequestedAt: {
      type: Date,
    },
    razorpay_order_id: {
      type: String,
    },
    razorpay_payment_id: {
      type: String,
    },
    razorpay_signature: {
      type: String,
    },
    refund_id: {
      type: String,
    },
    webhook_event_id: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
