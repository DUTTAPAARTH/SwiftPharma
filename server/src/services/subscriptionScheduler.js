import cron from "node-cron";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { processRefill } from "../controllers/subscriptionController.js";

let schedulerStarted = false;

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const checkDueRefills = async () => {
  try {
    const now = new Date();
    const dueSubscriptions = await Subscription.find({
      status: "active",
      nextRefillDate: { $lte: now },
    });

    let processed = 0;
    let failed = 0;

    for (const subscription of dueSubscriptions) {
      try {
        const result = await processRefill(subscription);
        if (result.success) processed += 1;
        else failed += 1;
      } catch (error) {
        failed += 1;
        console.error("[subscriptionScheduler] processRefill failure", {
          subscriptionId: subscription._id,
          error,
        });
      }
    }

    console.log(
      `[subscriptionScheduler] checkDueRefills complete: processed=${processed}, failed=${failed}`,
    );
  } catch (error) {
    console.error("[subscriptionScheduler] checkDueRefills error", error);
  }
};

export const sendRefillReminders = async () => {
  try {
    const now = new Date();
    const activeSubscriptions = await Subscription.find({ status: "active" })
      .populate("product.productId", "name")
      .sort({ nextRefillDate: 1 });

    for (const subscription of activeSubscriptions) {
      try {
        const nextRefill = new Date(subscription.nextRefillDate);
        const reminderDays = Number(subscription.reminderDaysBefore || 2);
        const diffMs = nextRefill.getTime() - now.getTime();
        const daysUntilRefill = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntilRefill < 0 || daysUntilRefill > reminderDays) {
          continue;
        }

        if (isSameDay(subscription.reminderLastSentAt, now)) {
          continue;
        }

        const user = await User.findById(subscription.userId).select("email");
        const email = user?.email || "unknown-email";
        const medicineName =
          subscription.product?.name ||
          subscription.product?.productId?.name ||
          "Medicine";

        console.log(
          `Reminder: ${email} - ${medicineName} refills in ${daysUntilRefill} days`,
        );

        subscription.reminderLastSentAt = now;
        await subscription.save();
      } catch (error) {
        console.error("[subscriptionScheduler] reminder failure", {
          subscriptionId: subscription?._id,
          error,
        });
      }
    }
  } catch (error) {
    console.error("[subscriptionScheduler] sendRefillReminders error", error);
  }
};

export const startScheduler = () => {
  try {
    if (schedulerStarted) return;

    cron.schedule("0 * * * *", async () => {
      try {
        await checkDueRefills();
      } catch (error) {
        console.error("[subscriptionScheduler] hourly job failed", error);
      }
    });

    cron.schedule("0 9 * * *", async () => {
      try {
        await sendRefillReminders();
      } catch (error) {
        console.error(
          "[subscriptionScheduler] daily reminder job failed",
          error,
        );
      }
    });

    schedulerStarted = true;
    console.log("[subscriptionScheduler] started");
  } catch (error) {
    console.error("[subscriptionScheduler] failed to start", error);
  }
};

