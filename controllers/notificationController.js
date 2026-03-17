import Notification from "../models/Notification.js";

/**
 * @desc    Get admin notifications with filters and pagination
 * @route   GET /api/notifications/admin
 * @access  Private/Admin
 */
const getAdminNotifications = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = { role: "admin" };
        if (status === "unread") {
            query.isRead = false;
        } else if (status === "read") {
            query.isRead = true;
        }

        const p = Math.max(1, parseInt(page));
        const l = Math.max(1, parseInt(limit));
        const skip = (p - 1) * l;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l);

        const total = await Notification.countDocuments({ role: "admin" });
        const read = await Notification.countDocuments({ role: "admin", isRead: true });
        const unread = await Notification.countDocuments({ role: "admin", isRead: false });

        const totalPages = Math.ceil((status === "all" || !status ? total : (status === "read" ? read : unread)) / l);
        const hasMore = p < totalPages;

        res.json({
            notifications,
            counts: {
                total,
                read,
                unread
            },
            currentPage: p,
            totalPages,
            hasMore
        });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Query: specifically for this user OR broadcasted to all users
        const query = {
            $or: [
                { recipient: req.user._id },
                { role: "user", recipient: null }
            ]
        };

        const p = Math.max(1, parseInt(page));
        const l = Math.max(1, parseInt(limit));
        const skip = (p - 1) * l;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l);

        const total = await Notification.countDocuments(query);
        const read = await Notification.countDocuments({ ...query, isRead: true });
        const unread = await Notification.countDocuments({ ...query, isRead: false });

        const totalPages = Math.ceil(total / l);
        const hasMore = p < totalPages;

        res.json({
            notifications,
            counts: {
                total,
                read,
                unread
            },
            currentPage: p,
            totalPages,
            hasMore
        });
    } catch (error) {
        console.error("Get User Notifications Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private/Admin
 */
const markAsRead = async (req, res) => {
    try {
        const query = { _id: req.params.id };

        // If not admin, ensure they own the notification
        if (!req.user.isAdmin) {
            query.recipient = req.user._id;
        }

        const notification = await Notification.findOneAndUpdate(
            query,
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private/Admin
 */
const markAllRead = async (req, res) => {
    try {
        const query = { isRead: false };

        // If not admin, only mark their own as read
        if (!req.user.isAdmin) {
            query.recipient = req.user._id;
        } else {
            query.role = "admin";
        }

        await Notification.updateMany(
            query,
            { $set: { isRead: true } }
        );

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Mark All Read Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Delete single notification
 * @route   DELETE /api/notifications/:id
 * @access  Private/Admin
 */
const deleteNotification = async (req, res) => {
    try {
        const query = { _id: req.params.id };

        // If not admin, ensure they own the notification
        if (!req.user.isAdmin) {
            query.recipient = req.user._id;
        }

        const notification = await Notification.findOneAndDelete(query);

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Delete multiple notifications
 * @route   POST /api/notifications/delete-multiple
 * @access  Private/Admin
 */
const deleteMultipleNotifications = async (req, res) => {
    try {
        const { ids } = req.body;
        const query = { _id: { $in: ids } };

        // If not admin, ensure they own the notifications
        if (!req.user.isAdmin) {
            query.recipient = req.user._id;
        } else {
            query.role = "admin";
        }

        await Notification.deleteMany(query);

        res.json({ message: "Selected notifications deleted" });
    } catch (error) {
        console.error("Delete Multiple Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications/delete-all
 * @access  Private/Admin
 */
const deleteAllNotifications = async (req, res) => {
    try {
        const query = {};

        // If not admin, only delete their own
        if (!req.user.isAdmin) {
            query.recipient = req.user._id;
        } else {
            query.role = "admin";
        }

        await Notification.deleteMany(query);

        res.json({ message: "All notifications deleted" });
    } catch (error) {
        console.error("Delete All Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Admin sends a notification to a user or broadcasts to all users
 * @route   POST /api/notifications/send
 * @access  Private/Admin
 */
const sendNotification = async (req, res) => {
    try {
        const { title, message, type = "system", recipientId = null } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }

        const notif = new Notification({
            title,
            message,
            type,
            role: "user",
            recipient: recipientId || null,
            isRead: false,
        });

        const saved = await notif.save();

        // Emit via socket if available
        const io = req.app.get("io");
        if (io) {
            if (recipientId) {
                io.to(`user_${recipientId}`).emit("notification:new", saved);
            } else {
                io.emit("notification:new", saved);
            }
        }

        res.status(201).json({ message: "Notification sent", notification: saved });
    } catch (error) {
        console.error("Send Notification Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export {
    getAdminNotifications,
    getUserNotifications,
    markAsRead,
    markAllRead,
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllNotifications,
    sendNotification
};
