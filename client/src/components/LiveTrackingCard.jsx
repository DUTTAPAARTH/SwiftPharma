import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

const markerIcon = L.divIcon({
  className: "agent-live-marker",
  html: '<span class="agent-live-ripple"></span><span class="agent-live-dot">🛵</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const to12hTime = (value) => {
  if (!value) return "Calculating...";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Calculating...";
  return `by ${dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};

const minutesAgoLabel = (value, nowTick) => {
  if (!value) return "Agent location updated recently";
  const ms = nowTick - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Agent location updated recently";
  const mins = Math.max(0, Math.floor(ms / 60000));
  return `Agent location updated ${mins} min ago`;
};

const AgentMarker = ({ position }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!position || !markerRef.current) return;
    markerRef.current.setLatLng([position.lat, position.lng]);
  }, [position?.lat, position?.lng]);

  if (!position) return null;
  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={markerIcon}
    />
  );
};

const LiveTrackingCard = ({ order, agentLocation, estimatedArrival }) => {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = order?.items || "Medicines";
  const totalAmount = Number(order?.totalAmount || 0);

  const center = useMemo(() => {
    if (agentLocation?.lat != null && agentLocation?.lng != null) {
      return [Number(agentLocation.lat), Number(agentLocation.lng)];
    }
    return [22.5726, 88.3639];
  }, [agentLocation?.lat, agentLocation?.lng]);

  return (
    <section className="panel-soft rounded-[32px] p-5 md:p-6 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-success animate-pulse"></span>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-success">
            Out for delivery
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-ink">
            ₹{totalAmount.toFixed(2)}
          </p>
          <p className="text-xs text-ink-soft">{summary}</p>
        </div>
      </div>

      <div
        className="mt-4 rounded-2xl border border-border-subtle overflow-hidden bg-background-light"
        style={{ height: 220 }}
      >
        {agentLocation ? (
          <MapContainer
            center={center}
            zoom={14}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            keyboard={false}
            style={{ height: "220px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AgentMarker position={agentLocation} />
          </MapContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center text-ink-soft">
              <p className="text-sm font-semibold">Locating your agent...</p>
              <span className="material-symbols-outlined mt-1 animate-spin">
                progress_activity
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-soft font-bold">
            Estimated arrival
          </p>
          <p className="text-sm font-semibold text-ink">
            {to12hTime(estimatedArrival)}
          </p>
        </div>
        <Link
          to={`/orders/${order?._id}/track`}
          className="text-sm font-semibold text-primary"
        >
          View order →
        </Link>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {minutesAgoLabel(agentLocation?.updatedAt, tick)}
      </p>
    </section>
  );
};

export default LiveTrackingCard;
