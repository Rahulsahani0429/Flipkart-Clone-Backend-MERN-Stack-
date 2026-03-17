import mongoose from "mongoose";
import { ObjectId } from "mongodb";

// Note: Using native MongoDB driver via mongoose.connection.db
const getSettings = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const settingsCollection = db.collection("settings");

        let settings = await settingsCollection.findOne({});

        if (!settings) {
            // Create default settings if not exists
            const defaultSettings = {
                store: {
                    storeName: "ProfitPulse Store",
                    supportEmail: "support@profitpulse.com",
                    supportPhone: "+91-1234567890",
                    address: "123 Business Avenue, Tech City",
                    currency: "INR",
                    timezone: "Asia/Kolkata"
                },
                orders: {
                    autoCancelUnpaidHours: 24,
                    allowCOD: true,
                    defaultOrderStatus: "Placed",
                    enableReturns: true,
                    returnWindowDays: 7
                },
                payments: {
                    enableUPI: true,
                    enableCard: true,
                    enableCOD: true,
                    taxPercent: 18,
                    shippingFee: 50
                },
                notifications: {
                    enableRealtime: true,
                    lowStockThreshold: 10,
                    notifyOnNewOrder: true,
                    notifyOnPaymentUpdate: true,
                    notifyOnOrderStatusChange: true
                },
                security: {
                    requireStrongPassword: true,
                    sessionTimeoutMinutes: 30,
                    allowMultipleSessions: false
                },
                updatedAt: new Date()
            };

            const result = await settingsCollection.insertOne(defaultSettings);
            settings = { ...defaultSettings, _id: result.insertedId };
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateSettings = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const settingsCollection = db.collection("settings");

        const { store, orders, payments, notifications, security } = req.body;

        // Validation
        if (payments) {
            if (payments.taxPercent < 0 || payments.taxPercent > 100) {
                return res.status(400).json({ message: "Tax percentage must be between 0 and 100" });
            }
            if (payments.shippingFee < 0) {
                return res.status(400).json({ message: "Shipping fee cannot be negative" });
            }
        }

        if (orders) {
            if (orders.autoCancelUnpaidHours < 0 || orders.autoCancelUnpaidHours > 168) {
                return res.status(400).json({ message: "Auto-cancel hours must be between 0 and 168" });
            }
            if (orders.returnWindowDays < 0 || orders.returnWindowDays > 365) {
                return res.status(400).json({ message: "Return window must be between 0 and 365" });
            }
        }

        if (notifications && (notifications.lowStockThreshold < 0 || notifications.lowStockThreshold > 10000)) {
            return res.status(400).json({ message: "Low stock threshold must be between 0 and 10000" });
        }

        const updatedData = {
            ...(store && { store }),
            ...(orders && { orders }),
            ...(payments && { payments }),
            ...(notifications && { notifications }),
            ...(security && { security }),
            updatedAt: new Date()
        };

        const result = await settingsCollection.findOneAndUpdate(
            {},
            { $set: updatedData },
            { returnDocument: "after", upsert: true }
        );

        res.status(200).json({
            settings: result.value || result, // findOneAndUpdate behavior varies slightly by driver version
            message: "Settings updated successfully"
        });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export { getSettings, updateSettings };
