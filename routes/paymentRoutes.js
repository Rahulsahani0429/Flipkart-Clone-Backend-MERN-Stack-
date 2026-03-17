import express from "express";
import {
    createRazorpayOrder,
    verifyPayment,
    handleWebhook,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);
router.post("/webhook", handleWebhook); // Webhook should be public but signed

export default router;
