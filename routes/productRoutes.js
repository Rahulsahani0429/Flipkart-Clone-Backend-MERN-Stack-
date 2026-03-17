import express from "express";
import {
  getProducts, getCategories, getBrands,
  getProductById, createProduct, updateProduct, deleteProduct,
} from "../controllers/productController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Metadata endpoints — MUST be before /:id to avoid collision
router.get("/categories", getCategories);
router.get("/brands", getBrands);

router.route("/").get(getProducts).post(protect, admin, createProduct);
router.route("/:id")
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

export default router;
