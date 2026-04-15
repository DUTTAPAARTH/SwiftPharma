import { Router } from "express";
import {
  cancelRelay,
  claimRelay,
  createRelay,
  getFallbackPharmacies,
  getActiveRelay,
  getActiveRelays,
  getRelayHistory,
  getRelayHistoryById,
  getRelayByToken,
  reorderRelayHistory,
  resolveRelay,
  logAmbulanceCall,
  triageSymptoms,
  updateEmergencyContact,
} from "../controllers/emergencyController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", authenticate, createRelay);
router.patch("/:relayId/claim", authenticate, claimRelay);
router.patch("/:relayId/cancel", authenticate, cancelRelay);
router.patch("/:relayId/resolve", authenticate, resolveRelay);
router.get("/active", authenticate, getActiveRelay);
router.get("/nearby", authenticate, getActiveRelays);
router.post("/triage", authenticate, triageSymptoms);
router.post("/ambulance-call", authenticate, logAmbulanceCall);
router.get("/history", authenticate, getRelayHistory);
router.get("/history/:historyId", authenticate, getRelayHistoryById);
router.post("/history/:historyId/reorder", authenticate, reorderRelayHistory);
router.get("/fallback-pharmacies", getFallbackPharmacies);
router.get("/track/:token", getRelayByToken);
router.patch("/contact", authenticate, updateEmergencyContact);

export default router;
