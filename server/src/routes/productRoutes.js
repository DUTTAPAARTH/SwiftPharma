import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  getProductsByCategory,
  searchProducts,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { uploadProductImage } from "../middleware/uploadMiddleware.js";

const router = Router();
router.get("/", listProducts);
router.get("/category/:categoryName", getProductsByCategory);
router.get("/search", searchProducts);
router.get("/:id", getProduct);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  uploadProductImage,
  createProduct,
);
export default router;
