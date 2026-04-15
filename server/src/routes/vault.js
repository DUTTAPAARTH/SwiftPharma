import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  addVaultItem,
  deleteVaultItem,
  getReadiness,
  getVault,
  reorderVaultItem,
  updateVaultItem,
} from "../controllers/vaultController.js";

const router = Router();

router.get("/", authenticate, getVault);
router.post("/", authenticate, addVaultItem);
router.patch("/:itemId", authenticate, updateVaultItem);
router.delete("/:itemId", authenticate, deleteVaultItem);
router.get("/readiness", authenticate, getReadiness);
router.post("/:itemId/reorder", authenticate, reorderVaultItem);

export default router;
