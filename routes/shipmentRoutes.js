import express from "express";
import { getShipmentByOrder } from "../controllers/shipmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/:orderId").get(protect, getShipmentByOrder);

export default router;
