import { Router } from "express";
import {
  login,
  signup,
  logout,
  getCurrentUser,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, getCurrentUser);

export default router;

