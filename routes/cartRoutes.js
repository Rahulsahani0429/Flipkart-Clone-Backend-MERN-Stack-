import express from 'express';
const router = express.Router();
import { getCart, syncCart, clearCart } from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

router.route('/')
    .get(protect, getCart)
    .post(protect, syncCart)
    .delete(protect, clearCart);

export default router;
