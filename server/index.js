import dotenv from "dotenv";
import http from "http";

dotenv.config({ path: ".env" });
console.log(
  "[ENV] Loading from .env - GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "✓" : "✗",
);

// Important: load env before importing app/config modules that read process.env
const { default: app, startAppServices } = await import("./src/app.js");
const { default: connectDB } = await import("./src/config/db.js");
const { initSocket } = await import("./src/socket.js");
const { startEmergencyExpiryJob } =
  await import("./src/jobs/emergencyExpiry.js");
const { startEmergencyEscalationJob } =
  await import("./src/jobs/emergencyEscalation.js");
const { startVaultReminderJob } = await import("./src/jobs/vaultReminder.js");
const { startDoseEscalationJob } = await import("./src/jobs/doseEscalation.js");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    startAppServices();

    // Start Express server via HTTP server so Socket.IO can attach
    const server = http.createServer(app);
    initSocket(server);

    startEmergencyExpiryJob();
    startEmergencyEscalationJob();
    startVaultReminderJob();
    startDoseEscalationJob();

    server.listen(PORT, () => {
      console.log(`🚀 SwiftPharma API running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
      console.log(`✅ Server is ready to accept requests`);
    });

    // Keep server alive
    server.keepAliveTimeout = 61 * 1000;
    server.headersTimeout = 65 * 1000;

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${PORT} is already in use. Please kill the process or use a different port.`,
        );
        process.exit(1);
      } else {
        console.error("❌ Server error:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Catch unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

// Catch uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});
