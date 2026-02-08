import app from "../server/src/app.js";
import connectDB from "../server/src/config/db.js";

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (error) {
      console.error("[Serverless] DB connection failed:", error.message);
      return res.status(503).json({ 
        error: "Service temporarily unavailable",
        message: "Database connection failed"
      });
    }
  }
  
  return app(req, res);
}
