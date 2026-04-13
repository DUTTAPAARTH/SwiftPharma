import dotenv from "dotenv";

dotenv.config({ path: ".env" });
console.log(
  "[ENV] Loading from .env - GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "✓" : "✗",
);

// Important: load env before importing app/config modules that read process.env
const { default: app, startAppServices } = await import("./src/app.js");
const { default: connectDB } = await import("./src/config/db.js");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Try to connect to MongoDB
    try {
      await connectDB();
      console.log("✅ MongoDB connected successfully");
      startAppServices();
    } catch (dbError) {
      console.warn("⚠️  MongoDB connection failed - running without database");
      console.warn("   Make sure MongoDB is installed and running locally");
      console.warn(
        "   or update MONGO_URI in .env with a valid connection string",
      );
    }

    // Start Express server
    const server = app.listen(PORT, () => {
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
