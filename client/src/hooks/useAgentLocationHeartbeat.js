import { useEffect } from "react";
import { upsertDeliveryLocation } from "../services/deliveryService";

export const useAgentLocationHeartbeat = (enabled, intervalMs = 30000) => {
  useEffect(() => {
    if (!enabled) return undefined;
    if (!navigator.geolocation) return undefined;

    let stopped = false;

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (stopped) return;
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          try {
            await upsertDeliveryLocation({ lat, lng });
          } catch {
            // Silent failure: do not interrupt delivery workflow.
          }
        },
        () => {
          // Silent failure: some devices/users block location updates.
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
      );
    };

    tick();
    const timer = window.setInterval(tick, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
};
