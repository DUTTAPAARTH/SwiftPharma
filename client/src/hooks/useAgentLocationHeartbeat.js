import { useEffect } from "react";
import { upsertDeliveryLocation } from "../services/deliveryService";

export const useAgentLocationHeartbeat = (enabled, intervalMs = 30000) => {
  useEffect(() => {
    if (!enabled) return undefined;
    if (!navigator.geolocation) return undefined;

    let stopped = false;
    let watchId = null;

    // Use watchPosition for continuous accurate tracking
    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (stopped) return;
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy || 999);
        
        // Only send positions with reasonable accuracy
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        if (accuracy > 100) return; // Skip very inaccurate positions
        
        try {
          await upsertDeliveryLocation({ lat, lng, accuracy });
        } catch {
          // Silent failure: do not interrupt delivery workflow.
        }
      },
      () => {
        // Silent failure: some devices/users block location updates.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => {
      stopped = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, intervalMs]);
};
