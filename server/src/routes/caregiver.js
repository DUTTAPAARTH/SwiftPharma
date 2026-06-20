import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/authMiddleware.js";
import {
  acceptInvite,
  getMyCaregiver,
  getMyPatients,
  getPatientAdherence,
  getPendingAlerts,
  inviteCaregiver,
  respondToAlert,
  revokeCaregiver,
} from "../controllers/caregiverController.js";

const router = Router();

router.post("/invite", authenticate, inviteCaregiver);
router.get("/accept/:inviteToken", optionalAuthenticate, acceptInvite);
router.delete("/:linkId/revoke", authenticate, revokeCaregiver);
router.get("/my-caregiver", authenticate, getMyCaregiver);
router.get("/my-patients", authenticate, getMyPatients);
router.get("/patients/:patientId/adherence", authenticate, getPatientAdherence);
router.post("/alerts/:alertId/respond", authenticate, respondToAlert);
router.get("/alerts/pending", authenticate, getPendingAlerts);

export default router;

