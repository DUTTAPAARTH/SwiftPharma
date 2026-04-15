import cron from "node-cron";
import Notification from "../models/Notification.js";
import VaultItem from "../models/VaultItem.js";

let vaultReminderStarted = false;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 14 * DAY_MS;

export const startVaultReminderJob = () => {
  if (vaultReminderStarted) return;

  cron.schedule("0 9 * * *", async () => {
    try {
      const now = new Date();
      const reminderCutoff = new Date(now.getTime() - DAY_MS);
      const expiryCutoff = new Date(now.getTime() + WINDOW_MS);

      const flaggedItems = await VaultItem.find({
        $and: [
          {
            $or: [
              { quantity: 0 },
              { expiryDate: { $gte: now, $lte: expiryCutoff } },
            ],
          },
          {
            $or: [
              { lastRefillRemindedAt: null },
              { lastRefillRemindedAt: { $lt: reminderCutoff } },
            ],
          },
        ],
      }).select("_id userId");

      if (!flaggedItems.length) {
        console.log("Vault reminder job: notified 0 users for 0 items");
        return;
      }

      const grouped = new Map();
      for (const item of flaggedItems) {
        const key = String(item.userId);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item._id);
      }

      const notifications = [];
      for (const [userId, itemIds] of grouped.entries()) {
        notifications.push({
          userId,
          type: "vault_reminder",
          message: `Your medicine vault needs attention — ${itemIds.length} item(s) expiring soon or out of stock`,
          data: { itemCount: itemIds.length, itemIds },
        });
      }

      if (notifications.length) {
        await Notification.insertMany(notifications, { ordered: false });
      }

      await VaultItem.updateMany(
        { _id: { $in: flaggedItems.map((item) => item._id) } },
        { $set: { lastRefillRemindedAt: now } },
      );

      console.log(
        `Vault reminder job: notified ${grouped.size} users for ${flaggedItems.length} items`,
      );
    } catch (error) {
      console.error("[vaultReminder] job failed", error);
    }
  });

  vaultReminderStarted = true;
  console.log("[vaultReminder] started (daily at 9:00 AM)");
};
