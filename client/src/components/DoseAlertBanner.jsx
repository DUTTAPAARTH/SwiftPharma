import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useEmergencySocket } from "../hooks/useEmergencySocket";
import * as caregiverService from "../services/caregiverService.js";
import { useHealthCompanion } from "../context/HealthCompanionContext";

const DoseAlertBanner = () => {
  const { user } = useContext(AuthContext);
  const { openWithMessage } = useHealthCompanion();
  const [alerts, setAlerts] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const isCustomer = String(user?.role || "").toLowerCase() === "customer";

  const fetchPendingAlerts = async () => {
    if (!isCustomer) return;
    try {
      const { data } = await caregiverService.getPendingAlerts();
      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch {
      setAlerts([]);
    }
  };

  useEffect(() => {
    if (!isCustomer) return;
    fetchPendingAlerts();
    const interval = setInterval(fetchPendingAlerts, 60 * 1000);
    return () => clearInterval(interval);
  }, [isCustomer]);

  useEmergencySocket({
    onDoseMissed: () => {
      fetchPendingAlerts();
    },
  });

  if (!isCustomer || !alerts.length) return null;

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(String(a._id)));

  if (!visibleAlerts.length) return null;

  const currentAlert = visibleAlerts[0];
  const moreCount = visibleAlerts.length - 1;

  const handleRespond = async (response) => {
    try {
      await caregiverService.respondToAlert(currentAlert._id, response);
      setDismissedIds((prev) => new Set([...prev, String(currentAlert._id)]));
      fetchPendingAlerts();

      if (response === "need_help") {
        openWithMessage(
          `I missed ${currentAlert?.medicineName || "my medicine"}. I need help on what to do now.`,
        );
        alert("Your caregiver has been notified");
      }
    } catch (error) {
      console.error("Failed to respond to alert", error);
    }
  };

  return (
    <div className="fixed top-20 left-0 right-0 z-50 mx-4 md:mx-0">
      <div
        style={{
          backgroundColor: "var(--color-background-danger, #fee2e2)",
          borderLeft: "4px solid var(--color-danger, #dc2626)",
        }}
        className="rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-lg border border-danger/20"
      >
        <div className="flex-1">
          <p className="font-black text-danger text-sm md:text-base">
            {currentAlert?.medicineName || "Medicine"} dose missed
          </p>
          {moreCount > 0 && (
            <p className="text-xs text-danger/70 mt-1">
              +{moreCount} more alert{moreCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleRespond("need_help")}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-danger text-white hover:bg-danger-dark transition-colors"
          >
            I need help
          </button>
          <button
            onClick={() => handleRespond("ok")}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-success text-success bg-success/10 hover:bg-success hover:text-white transition-all"
          >
            I took it
          </button>
        </div>

        <button
          onClick={() =>
            setDismissedIds(
              (prev) => new Set([...prev, String(currentAlert._id)]),
            )
          }
          className="absolute top-2 right-2 md:relative md:top-0 md:right-0 text-danger hover:text-danger-dark transition-colors text-xl"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default DoseAlertBanner;
