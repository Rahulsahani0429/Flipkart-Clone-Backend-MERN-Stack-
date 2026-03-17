import Shipment from "../models/Shipment.js";
import Order from "../models/Order.js";

/**
 * @desc    Get shipment by order ID
 * @route   GET /api/shipment/:orderId
 * @access  Private
 */
export const getShipmentByOrder = async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ orderId: req.params.orderId });

        if (!shipment) {
            // Auto-create shipment if order is SHIPPED or beyond but shipment is missing
            const order = await Order.findById(req.params.orderId);
            if (order) {
                if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.orderStatus)) {
                    shipment = await syncShipmentData(order._id, order.orderStatus, order.shippingAddress.city + ", " + order.shippingAddress.country);
                    return res.json(shipment);
                }

                if (order.orderStatus === "ORDER_CONFIRMED" || order.orderStatus === "PROCESSING") {
                    return res.status(200).json({
                        notShipped: true,
                        message: "Tracking will be available once your order is shipped."
                    });
                }
                return res.status(404).json({ message: "Shipment data not found for this order" });
            }
            return res.status(404).json({ message: "Order not found" });
        }

        res.json(shipment);
    } catch (error) {
        console.error("Get Shipment Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Create or update shipment (Admin/Internal)
 */
export const syncShipmentData = async (orderId, status, location = "Main Warehouse") => {
    try {
        let shipment = await Shipment.findOne({ orderId });

        const currentStatus = status;

        if (!shipment) {
            // Generate a random tracking number
            const trackingNumber = "SG" + Math.random().toString().slice(2, 12).toUpperCase();

            shipment = new Shipment({
                orderId,
                trackingNumber,
                currentStatus,
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                currentLocation: {
                    lat: 28.6139,
                    lng: 77.2090,
                    address: location
                },
                trackingHistory: [{
                    status: currentStatus,
                    location,
                    timestamp: new Date(),
                    description: `Shipment status updated to ${currentStatus}`
                }]
            });

            if (currentStatus === "OUT_FOR_DELIVERY") {
                shipment.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
                shipment.deliveryAgent = {
                    name: "Rahul Kumar",
                    phone: "+91 9876543210"
                };
            }
        } else {
            // Don't add duplicate status if it's the same
            if (shipment.currentStatus !== currentStatus) {
                shipment.currentStatus = currentStatus;
                shipment.trackingHistory.push({
                    status: currentStatus,
                    location,
                    timestamp: new Date(),
                    description: `Shipment status updated to ${currentStatus}`
                });

                if (currentStatus === "OUT_FOR_DELIVERY" && !shipment.deliveryOtp) {
                    shipment.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
                    shipment.deliveryAgent = {
                        name: "Rahul Kumar",
                        phone: "+91 9876543210"
                    };
                }
            }
        }

        await shipment.save();
        return shipment;
    } catch (error) {
        console.error("Sync Shipment Error:", error);
    }
};
