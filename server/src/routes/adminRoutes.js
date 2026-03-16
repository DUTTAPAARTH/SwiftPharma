import { Router } from "express";
import {
  adminDashboard,
  getDashboardStats,
  adminListPrescriptions,
  getPrescriptionQueue,
  getAllPrescriptions,
  getSinglePrescription,
  approvePrescription,
  rejectPrescription,
  getPrescriptionImage,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  getAdminOrderStats,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  updateAdminProductStock,
  getAnalyticsRevenue,
  getAnalyticsTopMedicines,
  getAnalyticsPrescriptions,
  getAnalyticsUsers,
  getAnalyticsSummary,
  getAdminUsers,
  getAdminUserById,
  updateAdminUserRole,
  toggleAdminUserSuspend,
} from "../controllers/adminController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { uploadProductImage } from "../middleware/uploadMiddleware.js";

const router = Router();

router.use(requireAdmin);

// Stats & dashboard
router.get("/stats", getDashboardStats);
router.get("/dashboard", adminDashboard);

// Prescriptions — static paths MUST come before parameterized /:id
router.get("/prescriptions/queue", getPrescriptionQueue);
router.get("/prescriptions/all", getAllPrescriptions);
router.get("/prescriptions/:id/image", getPrescriptionImage);
router.get("/prescriptions/:id", getSinglePrescription);
router.get("/prescriptions", adminListPrescriptions);
router.post("/prescriptions/:id/approve", approvePrescription);
router.post("/prescriptions/:id/reject", rejectPrescription);

// Orders
router.get("/orders/stats", getAdminOrderStats);
router.get("/orders", getAdminOrders);
router.get("/orders/:id", getAdminOrderById);
router.patch("/orders/:id/status", updateAdminOrderStatus);

// Products
router.get("/products", getAdminProducts);
router.post("/products", uploadProductImage, createAdminProduct);
router.patch("/products/:id/stock", updateAdminProductStock);
router.patch("/products/:id", uploadProductImage, updateAdminProduct);
router.delete("/products/:id", deleteAdminProduct);

// Analytics
router.get("/analytics/revenue", getAnalyticsRevenue);
router.get("/analytics/top-medicines", getAnalyticsTopMedicines);
router.get("/analytics/prescriptions", getAnalyticsPrescriptions);
router.get("/analytics/users", getAnalyticsUsers);
router.get("/analytics/summary", getAnalyticsSummary);

// Users
router.get("/users", getAdminUsers);
router.get("/users/:id", getAdminUserById);
router.patch("/users/:id/role", updateAdminUserRole);
router.patch("/users/:id/suspend", toggleAdminUserSuspend);

export default router;
