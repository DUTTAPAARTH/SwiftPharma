import { useEffect } from "react";
import { upsertDeliveryLocation } from "../services/deliveryService";

export const useAgentLocationHeartbeat = (enabled, intervalMs = 30000) => {
  useEffect(() => {
    if (!enabled) return undefined;
    if (!navigator.geolocation) return undefined;

    let stopped = false;
    let watchId = null;

    // Use watchPosition for continuous real-time tracking
    // maximumAge: 0 ensures fresh GPS reading every time, no cache
    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (stopped) return;
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy || 999);
        
        console.log(`[GPS] Fresh location: ${lat.toFixed(6)}, ${lng.toFixed(6)} (${Math.round(accuracy)}m)`);
        
        // Only send positions with reasonable accuracy
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        if (accuracy > 100) {
          console.warn(`[GPS] Skipping inaccurate position: ${Math.round(accuracy)}m`);
          return;
        }
        
        try {
          await upsertDeliveryLocation({ lat, lng, accuracy });
          console.log(`[GPS] Position updated on server`);
        } catch (err) {
          console.error(`[GPS] Failed to update position:`, err);
        }
      },
      (error) => {
        console.error(`[GPS] Error:`, error.message);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0  // Always get fresh position, never use cache
      },
    );

    return () => {
      stopped = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, intervalMs]);
};
