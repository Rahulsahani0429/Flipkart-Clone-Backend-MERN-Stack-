import mongoose from "mongoose";

const trackingHistorySchema = mongoose.Schema({
    status: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String
    }
});

const shipmentSchema = mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true
        },
        courierName: {
            type: String,
            required: true,
            default: "Squid-Game Express"
        },
        trackingNumber: {
            type: String,
            required: true,
            unique: true
        },
        estimatedDelivery: {
            type: Date
        },
        currentStatus: {
            type: String,
            required: true,
            enum: ["ORDER_CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"],
            default: "ORDER_CONFIRMED"
        },
        trackingHistory: [trackingHistorySchema],
        currentLocation: {
            lat: { type: Number, default: 28.6139 }, // Default to a city center if not provided
            lng: { type: Number, default: 77.2090 },
            address: { type: String, default: "In Transit" }
        },
        deliveryAgent: {
            name: { type: String },
            phone: { type: String }
        },
        deliveryOtp: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);

const Shipment = mongoose.model("Shipment", shipmentSchema);

export default Shipment;
