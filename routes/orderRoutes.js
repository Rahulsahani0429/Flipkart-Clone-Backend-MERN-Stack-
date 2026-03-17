import express from "express";
import {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  deleteOrder,
  cancelOrder,
  updateOrderToProcessing,
  updateOrderToShipped,
  generateInvoice,
  sendPaymentReminder,
  requestOrderReturn,
  updateReturnStatus,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, addOrderItems).get(protect, admin, getOrders);
router.route("/myorders").get(protect, getMyOrders);
router.route("/:id/invoice").get(protect, generateInvoice);
router.route("/:id/reminder").post(protect, admin, sendPaymentReminder);
router.route("/:id/return-status").put(protect, admin, updateReturnStatus);
router
  .route("/:id")
  .get(protect, getOrderById)
  .delete(protect, admin, deleteOrder);
router.route("/:id/pay").put(protect, updateOrderToPaid);
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered);
router.route("/:id/process").put(protect, admin, updateOrderToProcessing);
router.route("/:id/ship").put(protect, admin, updateOrderToShipped);
router.route("/:id/cancel").post(protect, cancelOrder);
router.route("/:id/return").post(protect, requestOrderReturn);

export default router;
