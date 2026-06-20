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
          const accuracy = Number(position.coords.accuracy || 999);
          
          // Only accept positions with accuracy better than 100m
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || accuracy > 100) return;
          
          try {
            await upsertDeliveryLocation({ lat, lng, accuracy });
          } catch {
            // Silent failure: do not interrupt delivery workflow.
          }
        },
        () => {
          // Silent failure: some devices/users block location updates.
        },
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 3000 },
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
