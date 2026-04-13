import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import aiScanRoutes from "./routes/aiScanRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";
import drugInfoRoutes from "./routes/drugInfoRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import healthRoute from "./routes/healthRoute.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { checkAuth } from "./middleware/authMiddleware.js";
import { initializeMedicalMCP } from "./config/mcp.js";
import { startScheduler } from "./services/subscriptionScheduler.js";
import { startTrackingSimulator } from "./services/trackingSimulator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

initializeMedicalMCP().catch((error) => {
  console.error("[medical-mcp] initialization failed", error);
});

// CORS configuration for credentials
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/ai", aiScanRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/drug-info", drugInfoRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/health", healthRoute);

// Auth check endpoint for frontend
app.get("/api/auth/check", checkAuth);

app.use(errorHandler);

export const startAppServices = () => {
  try {
    startScheduler();
    startTrackingSimulator();
  } catch (error) {
    console.error("[app] failed to start background services", error);
  }
};

export default app;
