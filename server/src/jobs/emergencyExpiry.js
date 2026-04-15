import cron from "node-cron";
import EmergencyRelay from "../models/EmergencyRelay.js";

let emergencyExpiryStarted = false;

export const startEmergencyExpiryJob = () => {
  if (emergencyExpiryStarted) return;

  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();
      const result = await EmergencyRelay.updateMany(
        {
          status: "broadcasting",
          expiresAt: { $lt: now },
        },
        {
          $set: {
            status: "cancelled",
            resolvedAt: now,
          },
        },
      );

      const count = Number(result.modifiedCount || 0);
      if (count > 0) {
        console.log(`[emergencyExpiry] expired relays cancelled=${count}`);
      }
    } catch (error) {
      console.error("[emergencyExpiry] job failed", error);
    }
  });

  emergencyExpiryStarted = true;
  console.log("[emergencyExpiry] started (every 15 minutes)");
};
