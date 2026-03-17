import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";

/**
 * @desc    Global search across multiple collections
 * @route   GET /api/admin/search
 * @access  Private/Admin
 */
export const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                users: [],
                products: [],
                orders: [],
                payments: []
            });
        }

        const regex = new RegExp(q, "i");

        // Users: name, email, role
        const users = await User.find({
            $or: [{ name: regex }, { email: regex }]
        }).sort({ createdAt: -1 }).limit(5).select("name email avatar role");

        // Products: name, category
        const products = await Product.find({
            $or: [{ name: regex }, { category: regex }]
        }).sort({ createdAt: -1 }).limit(5).select("name category image");

        // Orders & Payments (Search Order ID, Razorpay IDs)
        const isObjectId = mongoose.Types.ObjectId.isValid(q);

        const ordersQuery = {
            $or: [
                { razorpay_order_id: regex },
                { razorpay_payment_id: regex }
            ]
        };

        if (isObjectId) {
            ordersQuery.$or.push({ _id: q });
        }

        const orders = await Order.find(ordersQuery)
            .sort({ createdAt: -1 })
            .limit(5)
            .select("_id orderStatus totalPrice createdAt razorpay_order_id");

        // Payments (Transactions)
        const payments = await Order.find({
            $or: [
                { razorpay_payment_id: regex },
                { razorpay_order_id: regex }
            ]
        }).sort({ createdAt: -1 }).limit(5).select("_id razorpay_payment_id totalPrice paymentStatus createdAt");

        res.json({
            users,
            products,
            orders,
            payments: payments.filter(p => p.razorpay_payment_id) // Only return if it has a payment ID
        });
    } catch (error) {
        console.error("Global Search Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
