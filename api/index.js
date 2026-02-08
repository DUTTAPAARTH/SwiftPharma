import app from "../server/src/app.js";
import connectDB from "../server/src/config/db.js";

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("🔥 Serverless crash:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
