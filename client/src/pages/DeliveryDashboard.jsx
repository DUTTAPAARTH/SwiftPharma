import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import DeliveryAgentOrderCard from "../components/cards/DeliveryAgentOrderCard";
import Button from "../components/common/Button";
import { AuthContext } from "../context/AuthContext";
import { useAgentLocationHeartbeat } from "../hooks/useAgentLocationHeartbeat";
import { claimRelay, getNearbyRelays } from "../services/emergencyService";

const socketUrl = () => {
  const apiBase = String(import.meta.env.VITE_API_URL || "");
  if (apiBase) return apiBase.replace(/\/api\/?$/, "");
  return window.location.origin;
};

const sinceTime = (value) => {
  const created = new Date(value).getTime();
  const diffMin = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
};

const DeliveryDashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [relays, setRelays] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const isDelivery = useMemo(
    () => String(user?.role || "").toLowerCase() === "delivery",
    [user?.role],
  );

  useAgentLocationHeartbeat(isDelivery);

  useEffect(() => {
    if (!isDelivery) return undefined;
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await getNearbyRelays();
        if (!mounted) return;
        setRelays(Array.isArray(data?.relays) ? data.relays : []);
      } catch {
        if (!mounted) return;
        setRelays([]);
      }
    };

    load();
    const poll = window.setInterval(load, 20000);
    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, [isDelivery]);

  useEffect(() => {
    if (!isDelivery || !token) return undefined;

    const socket = io(socketUrl(), {
      auth: { token },
      transports: ["polling"],
      withCredentials: true,
    });

    socket.emit("agent:register", { agentId: user?.id || user?._id });

    socket.on("emergency:new", ({ relay }) => {
      if (!relay?._id) return;
      setRelays((prev) => {
        if (prev.some((item) => item._id === relay._id)) return prev;
        return [relay, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isDelivery, token, user?.id, user?._id]);

  const claim = async (relayId) => {
    try {
      await claimRelay(relayId);
      setRelays((prev) => prev.filter((item) => item._id !== relayId));
      setToastMessage("Emergency relay claimed successfully");
      window.setTimeout(() => setToastMessage(""), 2500);
    } catch (error) {
      setToastMessage(
        error?.response?.data?.message || "Unable to claim relay",
      );
      window.setTimeout(() => setToastMessage(""), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-page p-8 space-y-6">
      {toastMessage ? (
        <div className="fixed right-6 top-6 z-50 rounded-xl border border-success/40 bg-success/15 px-4 py-3 text-sm font-semibold text-success shadow-xl">
          {toastMessage}
        </div>
      ) : null}

      <div>
        <h1 className="text-headline font-nexus-bold mb-4">
          Delivery Dashboard
        </h1>
        <div className="accent-bar-violet w-20"></div>
      </div>

      {isDelivery ? (
        <section className="card-base p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-nexus-bold text-ink">
              Emergency relays
            </h2>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
              Live requests
            </span>
          </div>

          {!relays.length ? (
            <p className="rounded-xl border border-border-subtle bg-white/70 p-4 text-sm text-ink-soft">
              No active emergency relays right now.
            </p>
          ) : (
            <div className="grid gap-3">
              {relays.map((relay) => (
                <article
                  key={relay._id}
                  className="rounded-2xl border border-danger/25 bg-white p-4 shadow-soft"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black text-ink">
                        {relay.patientFirstName || "Patient"}
                      </p>
                      <p className="text-xs text-ink-soft mt-1">
                        {relay.distanceKm != null
                          ? `${relay.distanceKm} km away`
                          : "Nearby"}{" "}
                        - {sinceTime(relay.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      className="!bg-danger hover:!bg-danger/90"
                      onClick={() => claim(relay._id)}
                    >
                      Claim and respond
                    </Button>
                  </div>

                  <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                    {(relay.medicines || []).map((medicine, index) => (
                      <li
                        key={`${medicine.name}-${index}`}
                        className="flex justify-between"
                      >
                        <span>{medicine.name}</span>
                        <span>{medicine.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="card-base p-8">
        <DeliveryAgentOrderCard
          orderId="1234"
          address="221B Baker Street"
          status="Out for Delivery"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="cta" className="flex-1 text-lg py-3">
          Mark as Delivered
        </Button>
        <Button variant="secondary" className="flex-1 text-lg py-3">
          View Map
        </Button>
        <Link to="/" className="flex-1">
          <Button variant="secondary" className="w-full text-lg py-3">
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
