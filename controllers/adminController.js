import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";
import { getIO } from "../socket.js";

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        // Total Revenue Calculation
        const revenueData = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // Recently placed 5 orders
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("user", "name email avatar");

        // Order Status Distribution (for Donut Chart)
        // Normalize all status values to UPPER_CASE before grouping to eliminate
        // duplicates caused by mixed casing (e.g. "Delivered" vs "DELIVERED").
        const orderStatusStats = await Order.aggregate([
            {
                $addFields: {
                    normalizedStatus: {
                        $toUpper: { $trim: { input: "$orderStatus" } }
                    }
                }
            },
            {
                $group: {
                    _id: "$normalizedStatus",
                    value: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: "$_id",
                    value: 1,
                    _id: 0
                }
            },
            { $sort: { value: -1 } }
        ]);

        // Revenue Overview (Last 7 Days for Line Chart)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const revenueOverview = await Order.aggregate([
            {
                $match: {
                    isPaid: true,
                    paidAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
                    value: { $sum: "$totalPrice" }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    name: "$_id",
                    value: 1,
                    _id: 0
                }
            }
        ]);

        // If no revenue in last 7 days, provide dummy growth markers or counts
        // (Just returning counts for now as requested)

        return res.status(200).json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            recentOrders,
            orderStatusStats,
            revenueOverview
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get all customers with stats
 * @route   GET /api/admin/customers
 * @access  Private/Admin
 */
const getCustomers = async (req, res) => {
    try {
        const totalCustomers = await User.countDocuments();

        // summary stats
        const activeUsersCount = await User.countDocuments({ isAdmin: false });
        const blockedUsersCount = await User.countDocuments({ status: "Blocked" }); // assuming status field might exist or adding it logic

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        const newThisMonth = await User.countDocuments({ createdAt: { $gte: firstDayOfMonth } });

        // Detailed customer list with aggregated order data
        const customers = await User.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "_id",
                    foreignField: "user",
                    as: "orders"
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    avatar: 1,
                    isAdmin: 1,
                    phone: 1,
                    status: 1,
                    createdAt: 1,
                    totalOrders: { $size: "$orders" },
                    totalSpent: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$orders",
                                        as: "order",
                                        cond: { $eq: ["$$order.isPaid", true] }
                                    }
                                },
                                as: "paidOrder",
                                in: "$paidOrder.totalPrice"
                            }
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        return res.status(200).json({
            summary: {
                totalCustomers,
                activeUsers: activeUsersCount,
                blockedUsers: blockedUsersCount, // 0 if field doesn't exist
                newThisMonth
            },
            customers
        });
    } catch (error) {
        console.error("Get Customers Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get reports with filters
 * @route   GET /api/admin/reports
 * @access  Private/Admin
 */
const getReports = async (req, res) => {
    try {
        const { range, from, to } = req.query;
        let startDate = new Date();
        let endDate = new Date();

        if (range === "7d") {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === "30d") {
            startDate.setDate(startDate.getDate() - 30);
        } else if (range === "12m") {
            startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (from && to) {
            startDate = new Date(from);
            endDate = new Date(to);
        } else {
            startDate.setDate(startDate.getDate() - 30); // Default 30d
        }

        const db = mongoose.connection.db;

        // 1. KPIs
        const kpisArr = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] } },
                    totalOrders: { $sum: 1 },
                    refunds: { $sum: 0 } // Assuming no refund logic yet
                }
            }
        ]).toArray();

        const kpis = kpisArr[0] || { totalRevenue: 0, totalOrders: 0, refunds: 0 };

        const totalCustomers = await db.collection("users").countDocuments({ isAdmin: false });
        const newCustomers = await db.collection("users").countDocuments({
            isAdmin: false,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // 2. Revenue Trend
        const groupFormat = range === "12m" ? "%Y-%m" : "%Y-%m-%d";
        const revenueTrendResults = await db.collection("orders").aggregate([
            { $match: { isPaid: true, createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
                    value: { $sum: "$totalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // 3. Orders By Status — normalize to UPPER_CASE before grouping
        const ordersByStatus = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $addFields: { normalizedStatus: { $toUpper: { $trim: { input: "$orderStatus" } } } } },
            { $group: { _id: "$normalizedStatus", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]).toArray();

        // 4. Payment Methods
        const paymentMethods = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
            { $project: { method: { $ifNull: ["$_id", "Unknown"] }, count: 1, _id: 0 } }
        ]).toArray();

        // 5. Top Products
        const topProducts = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.name",
                    soldQty: { $sum: "$orderItems.qty" },
                    revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } }
                }
            },
            { $sort: { soldQty: -1 } },
            { $limit: 5 },
            { $project: { name: "$_id", soldQty: 1, revenue: 1, _id: 0 } }
        ]).toArray();

        // 6. Daily Report Table
        const dailyReport = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] } }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
            { $project: { date: "$_id", orders: 1, revenue: 1, _id: 0 } }
        ]).toArray();

        // Map Trend to labels/values
        const trend = {
            labels: revenueTrendResults.map(r => r._id),
            values: revenueTrendResults.map(r => r.value)
        };

        return res.status(200).json({
            range,
            from: startDate,
            to: endDate,
            kpis: {
                ...kpis,
                totalCustomers,
                newCustomers
            },
            charts: {
                revenueTrend: trend,
                ordersByStatus,
                paymentMethods,
                topProducts
            },
            table: dailyReport
        });

    } catch (error) {
        console.error("Get Reports Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get detailed statistics with filters
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getAdminStats = async (req, res) => {
    try {
        const { range, from, to } = req.query;
        let startDate = new Date();
        let endDate = new Date();

        if (range === "7d") {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === "30d") {
            startDate.setDate(startDate.getDate() - 30);
        } else if (range === "12m") {
            startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (from && to) {
            startDate = new Date(from);
            endDate = new Date(to);
        } else {
            startDate.setDate(startDate.getDate() - 30);
        }

        const db = mongoose.connection.db;

        // 1. KPIs Aggregation — compare normalised uppercase status values
        const kpisArr = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $addFields: {
                    normalizedStatus: { $toUpper: { $trim: { input: "$orderStatus" } } }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    paidOrders: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] } },
                    deliveredOrders: { $sum: { $cond: [{ $eq: ["$normalizedStatus", "DELIVERED"] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ["$normalizedStatus", "CANCELLED"] }, 1, 0] } },
                    totalRevenue: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] } }
                }
            }
        ]).toArray();

        const baseKpis = kpisArr[0] || { totalOrders: 0, paidOrders: 0, deliveredOrders: 0, cancelledOrders: 0, totalRevenue: 0 };

        const kpis = {
            totalOrders: baseKpis.totalOrders,
            paidOrders: baseKpis.paidOrders,
            deliveredOrders: baseKpis.deliveredOrders,
            grossRevenue: baseKpis.totalRevenue,
            avgOrderValue: baseKpis.paidOrders > 0 ? baseKpis.totalRevenue / baseKpis.paidOrders : 0,
            deliveryRate: baseKpis.totalOrders > 0 ? (baseKpis.deliveredOrders / baseKpis.totalOrders) * 100 : 0,
            cancelRate: baseKpis.totalOrders > 0 ? (baseKpis.cancelledOrders / baseKpis.totalOrders) * 100 : 0,
            paidRate: baseKpis.totalOrders > 0 ? (baseKpis.paidOrders / baseKpis.totalOrders) * 100 : 0
        };

        // 2. Revenue Trend
        const groupFormat = range === "12m" ? "%Y-%m" : "%Y-%m-%d";
        const revenueTrendResults = await db.collection("orders").aggregate([
            { $match: { isPaid: true, createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
                    value: { $sum: "$totalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // 3. Order Funnel — normalize status before grouping
        const orderFunnel = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $addFields: { normalizedStatus: { $toUpper: { $trim: { input: "$orderStatus" } } } } },
            { $group: { _id: "$normalizedStatus", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]).toArray();

        // 4. Payment Methods
        const paymentMethods = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
            { $project: { method: { $ifNull: ["$_id", "Unknown"] }, count: 1, _id: 0 } }
        ]).toArray();

        // 5. Top Categories
        const topCategories = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, isPaid: true } },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: { $ifNull: ["$orderItems.category", "Uncategorized"] },
                    revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } }
                }
            },
            { $sort: { revenue: -1 } },
            { $project: { category: "$_id", revenue: 1, _id: 0 } }
        ]).toArray();

        // 6. Top Products
        const topProducts = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.name",
                    soldQty: { $sum: "$orderItems.qty" },
                    revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } }
                }
            },
            { $sort: { soldQty: -1 } },
            { $limit: 10 },
            { $project: { name: "$_id", soldQty: 1, revenue: 1, _id: 0 } }
        ]).toArray();

        // 7. Daily Summary Table
        const dailySummary = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] } },
                    paidOrders: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] } },
                    deliveredOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Delivered"] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "Cancelled"] }, 1, 0] } }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
            { $project: { date: "$_id", orders: 1, revenue: 1, paidOrders: 1, deliveredOrders: 1, cancelledOrders: 1, _id: 0 } }
        ]).toArray();

        // 8. Top Customers
        const topCustomers = await db.collection("orders").aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, isPaid: true } },
            {
                $group: {
                    _id: "$user",
                    spent: { $sum: "$totalPrice" },
                    ordersCount: { $sum: 1 }
                }
            },
            { $sort: { spent: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    name: "$userDetails.name",
                    email: "$userDetails.email",
                    ordersCount: 1,
                    spent: 1,
                    _id: 0
                }
            }
        ]).toArray();

        return res.status(200).json({
            range,
            from: startDate,
            to: endDate,
            kpis,
            charts: {
                revenueTrend: {
                    labels: revenueTrendResults.map(r => r._id),
                    values: revenueTrendResults.map(r => r.value)
                },
                orderFunnel,
                paymentMethods,
                topCategories,
                topProducts
            },
            tables: {
                dailySummary,
                topCustomers
            }
        });

    } catch (error) {
        console.error("Get Stats Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Update user by admin
 * @route   PUT /api/admin/customers/:id
 * @access  Private/Admin
 */
const updateUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = req.body.name || user.name;
        user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
        user.role = req.body.role || user.role;
        user.status = req.body.status || user.status;
        user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

        const updatedUser = await user.save();

        // Real-time update via Socket.io
        const io = getIO();
        io.emit("customerUpdated", {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            status: updatedUser.status,
            isAdmin: updatedUser.isAdmin,
        });

        return res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            status: updatedUser.status,
            isAdmin: updatedUser.isAdmin,
        });
    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get single order by ID (admin)
 * @route   GET /api/admin/orders/:id
 * @access  Private/Admin
 */
const getAdminOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("user", "name email avatar phone createdAt")
            .populate("orderItems.product", "name sku images");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Attach customer lifetime stats (user may have been deleted)
        let customerStats = { totalOrders: 0, lifetimeSpend: 0 };
        if (order.user && order.user._id) {
            const customerOrders = await Order.find({ user: order.user._id });
            const lifetimeSpend = customerOrders
                .filter((o) => o.isPaid)
                .reduce((sum, o) => sum + o.totalPrice, 0);
            customerStats = { totalOrders: customerOrders.length, lifetimeSpend };
        }

        return res.status(200).json({
            order,
            customerStats,
        });
    } catch (error) {
        console.error("Get Admin Order Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Update order status by admin
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private/Admin
 */
const updateAdminOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const validStatuses = ["ORDER_CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ message: "Invalid order status" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.orderStatus = orderStatus;
        if (orderStatus === "DELIVERED") {
            order.isDelivered = true;
            order.deliveredAt = new Date();
        }
        if (orderStatus === "CANCELLED") {
            order.isCancelled = true;
            order.cancelledAt = new Date();
        }

        const updated = await order.save();

        // Real-time push to user's browser
        try {
            const io = getIO();
            io.to(updated.user.toString()).emit("orderStatusUpdated", {
                orderId: updated._id,
                orderStatus: updated.orderStatus,
            });
        } catch (_) { }

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Update Admin Order Status Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Delete user by admin
 * @route   DELETE /api/admin/customers/:id
 * @access  Private/Admin
 */
const deleteUserByAdmin = async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);

        if (!userToDelete) {
            return res.status(404).json({ message: "User not found" });
        }

        // Security check: Prevent admin from deleting themselves
        if (userToDelete._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot delete yourself" });
        }

        // Security check: Prevent deleting the last admin
        if (userToDelete.isAdmin) {
            const adminCount = await User.countDocuments({ isAdmin: true });
            if (adminCount <= 1) {
                return res.status(400).json({ message: "Cannot delete the last remaining administrator" });
            }
        }

        await User.findByIdAndDelete(req.params.id);

        // Real-time update via Socket.io
        const io = getIO();
        io.emit("customerDeleted", req.params.id);

        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get full customer profile by ID (admin)
 * @route   GET /api/admin/customers/:id
 * @access  Private/Admin
 */
const getAdminCustomerById = async (req, res) => {
    try {
        const customer = await User.findById(req.params.id).select("-password");
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const customerId = customer._id;

        // Aggregate order statistics
        const statsAgg = await Order.aggregate([
            { $match: { user: customerId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpend: { $sum: { $cond: ["$isPaid", "$totalPrice", 0] } },
                    cancelledOrders: { $sum: { $cond: ["$isCancelled", 1, 0] } },
                    returnedOrders: {
                        $sum: {
                            $cond: [{ $ne: ["$returnStatus", "NONE"] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const raw = statsAgg[0] || { totalOrders: 0, totalSpend: 0, cancelledOrders: 0, returnedOrders: 0 };
        const avgOrderValue = raw.totalOrders > 0 ? raw.totalSpend / raw.totalOrders : 0;

        // Recent orders (last 20)
        const orders = await Order.find({ user: customerId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select("_id orderStatus paymentStatus isPaid totalPrice createdAt shippingAddress orderItems");

        // Extract unique shipping addresses from order history
        const addressMap = new Map();
        orders.forEach((o) => {
            if (o.shippingAddress?.address) {
                const key = `${o.shippingAddress.address}|${o.shippingAddress.city}`;
                if (!addressMap.has(key)) addressMap.set(key, o.shippingAddress);
            }
        });
        const addresses = Array.from(addressMap.values());

        // Build activity timeline
        const timeline = [];
        timeline.push({ type: "account_created", label: "Account Created", date: customer.createdAt });
        orders.forEach((o) => {
            timeline.push({ type: "order_placed", label: `Order #${o._id.toString().slice(-6).toUpperCase()} placed`, date: o.createdAt, orderId: o._id });
            if (o.isPaid) {
                timeline.push({ type: "payment", label: `Payment received for #${o._id.toString().slice(-6).toUpperCase()}`, date: o.paidAt || o.updatedAt, orderId: o._id });
            }
            if (o.returnStatus && o.returnStatus !== "NONE") {
                timeline.push({ type: "return", label: `Return requested for #${o._id.toString().slice(-6).toUpperCase()}`, date: o.returnRequestedAt || o.updatedAt, orderId: o._id });
            }
        });
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.status(200).json({
            customer,
            stats: {
                totalOrders: raw.totalOrders,
                totalSpend: raw.totalSpend,
                cancelledOrders: raw.cancelledOrders,
                returnedOrders: raw.returnedOrders,
                avgOrderValue,
            },
            orders,
            addresses,
            timeline: timeline.slice(0, 30),
        });
    } catch (error) {
        console.error("Get Admin Customer Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export { getDashboardStats, getCustomers, getReports, getAdminStats, updateUserByAdmin, deleteUserByAdmin, getAdminOrderById, updateAdminOrderStatus, getAdminCustomerById };

