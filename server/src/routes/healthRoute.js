import express from "express";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Debug endpoint to check CORS configuration
router.get("/cors-check", (_req, res) => {
  const clientUrl = process.env.CLIENT_URL || "not set";
  const allowedOrigins = clientUrl.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  
  res.json({
    status: "ok",
    clientUrl,
    allowedOrigins,
    nodeEnv: process.env.NODE_ENV,
  });
});

export default router;
