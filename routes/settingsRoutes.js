import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(admin);

router.route("/")
    .get(getSettings)
    .patch(updateSettings);

export default router;
