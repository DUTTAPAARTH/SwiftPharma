import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  getActiveTracking,
  getAgentLocation,
} from "../services/orderTrackingService";

export const useOrderTracking = () => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [hasActiveTracking, setHasActiveTracking] = useState(false);
  const [order, setOrder] = useState(null);
  const [agentLocation, setAgentLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);

  useEffect(() => {
    let mounted = true;
    let pollId = null;

    const load = async ({ withLoader = false } = {}) => {
      if (withLoader) setLoading(true);
      try {
        const { data } = await getActiveTracking();
        if (!mounted) return;

        if (!data?.hasActiveTracking) {
          setHasActiveTracking(false);
          setOrder(null);
          setAgentLocation(null);
          setEstimatedArrival(null);
          return;
        }

        setHasActiveTracking(true);
        setOrder(data.order || null);
        setAgentLocation(data.agentLocation || null);
        setEstimatedArrival(data.estimatedArrival || null);

        if (!data.agentLocation && data?.order?._id) {
          try {
            const { data: loc } = await getAgentLocation(data.order._id);
            if (!mounted) return;
            if (loc?.tracking && loc?.agentLocation) {
              setAgentLocation(loc.agentLocation);
              if (loc.estimatedArrival)
                setEstimatedArrival(loc.estimatedArrival);
            }
          } catch {
            // Keep last known location from active tracking payload.
          }
        }
      } catch {
        if (!mounted) return;
        setHasActiveTracking(false);
        setOrder(null);
        setAgentLocation(null);
        setEstimatedArrival(null);
      } finally {
        if (mounted && withLoader) setLoading(false);
      }
    };

    load({ withLoader: true });
    pollId = window.setInterval(() => {
      load();
    }, 10000);

    return () => {
      mounted = false;
      if (pollId) window.clearInterval(pollId);
    };
  }, [token]);

  return { hasActiveTracking, order, agentLocation, estimatedArrival, loading };
};
