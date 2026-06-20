import { useEffect } from "react";
import { upsertDeliveryLocation } from "../services/deliveryService";

export const useAgentLocationHeartbeat = (enabled, intervalMs = 30000) => {
  useEffect(() => {
    if (!enabled) return undefined;
    if (!navigator.geolocation) return undefined;

    let stopped = false;
    let bestAccuracy = Infinity;
    let lastSentLocation = null;

    let watchId = null;

    // Use watchPosition for continuous accurate tracking
    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (stopped) return;
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy || 999);
        
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        
        // Accept any position up to 500m, but prioritize better accuracy
        if (accuracy > 500) {
          console.log(`[GPS Agent] ❌ Position too inaccurate (${accuracy.toFixed(0)}m), skipping`);
          return;
        }

        // First position - send immediately even if not perfect
        if (lastSentLocation === null) {
          console.log(`[GPS Agent] ✅ Initial position sent: ${accuracy.toFixed(0)}m accuracy`);
          lastSentLocation = { lat, lng, accuracy };
          bestAccuracy = accuracy;
          try {
            await upsertDeliveryLocation({ lat, lng, accuracy });
          } catch {
            // Silent failure: do not interrupt delivery workflow.
          }
          return;
        }

        // Send update if accuracy improved by at least 20m OR location moved significantly
        const accuracyImprovement = bestAccuracy - accuracy;
        const distanceMoved = lastSentLocation ? 
          Math.sqrt(Math.pow(lat - lastSentLocation.lat, 2) + Math.pow(lng - lastSentLocation.lng, 2)) * 111000 : 
          0; // Rough meters

        if (accuracyImprovement >= 20 || distanceMoved > 50) {
          console.log(`[GPS Agent] ✅ Update sent: ${accuracy.toFixed(0)}m accuracy (improved by ${accuracyImprovement.toFixed(0)}m or moved ${distanceMoved.toFixed(0)}m)`);
          lastSentLocation = { lat, lng, accuracy };
          bestAccuracy = Math.min(bestAccuracy, accuracy);
          try {
            await upsertDeliveryLocation({ lat, lng, accuracy });
          } catch {
            // Silent failure: do not interrupt delivery workflow.
          }
        } else {
          console.log(`[GPS Agent] ⏭️ Skipped: ${accuracy.toFixed(0)}m (best ${bestAccuracy.toFixed(0)}m, moved ${distanceMoved.toFixed(0)}m)`);
        }
      },
      () => {
        console.log(`[GPS Agent] ❌ Location permission denied or error`);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 30000,
        maximumAge: 0  // Always fresh for best accuracy
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
