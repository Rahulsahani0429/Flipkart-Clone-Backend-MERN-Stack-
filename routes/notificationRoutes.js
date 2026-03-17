import express from "express";
import {
    getAdminNotifications,
    getUserNotifications,
    markAsRead,
    markAllRead,
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllNotifications,
    sendNotification,
} from "../controllers/notificationController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getUserNotifications);
router.route("/admin").get(protect, admin, getAdminNotifications);
router.route("/send").post(protect, admin, sendNotification);
router.route("/read-all").patch(protect, markAllRead);
router.route("/delete-all").delete(protect, deleteAllNotifications);
router.route("/delete-multiple").post(protect, deleteMultipleNotifications);
router.route("/:id/read").patch(protect, markAsRead);
router.route("/:id").delete(protect, deleteNotification);

export default router;
