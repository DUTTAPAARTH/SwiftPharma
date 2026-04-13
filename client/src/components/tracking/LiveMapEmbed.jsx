import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { fetchOrderTracking } from "../../services/trackingService";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const agentIcon = L.divIcon({
  className: "",
  html: '<div style="width:32px;height:32px;border-radius:50%;background:#00bcd4;color:#02151a;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;border:3px solid #083244;box-shadow:0 0 10px #00bcd466;">A</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destinationIcon = L.divIcon({
  className: "",
  html: '<div style="width:32px;height:32px;border-radius:50%;background:#f97316;color:#1f1301;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;border:3px solid #7c2d12;box-shadow:0 0 10px #f9731666;">D</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const formatEta = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "Arriving shortly";
  const mins = Math.ceil(diffMs / 60000);
  return `${mins} min away`;
};

const toValidPoint = (location) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
};

const LiveMapEmbed = ({ orderId }) => {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let timer;

    const load = async (withLoader = false) => {
      if (withLoader) setLoading(true);
      try {
        const { data } = await fetchOrderTracking(orderId);
        if (!mounted) return;
        setPayload(data);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Tracking unavailable");
      } finally {
        if (withLoader && mounted) setLoading(false);
      }
    };

    load(true);
    timer = setInterval(() => load(false), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [orderId]);

  const tracking = payload?.tracking;

  const currentPoint = useMemo(() => {
    return toValidPoint(tracking?.currentLocation);
  }, [tracking]);

  const destinationPoint = useMemo(() => {
    return toValidPoint(tracking?.destinationLocation);
  }, [tracking]);

  const center = currentPoint || destinationPoint || [22.5726, 88.3639];
  const linePoints = currentPoint && destinationPoint ? [currentPoint, destinationPoint] : [];
  const eta = formatEta(tracking?.estimatedDeliveryTime);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-[#07111f] h-48 flex items-center justify-center">
        <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest animate-pulse">
          Loading live map…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 px-5 py-4 text-sm text-slate-400">
        <span className="material-symbols-outlined text-sm align-middle mr-2">location_off</span>
        Live map not available yet — agent location will appear once dispatched.
      </div>
    );
  }

  if (!currentPoint && !destinationPoint) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 px-5 py-4 text-sm text-slate-400">
        <span className="material-symbols-outlined text-sm align-middle mr-2">location_searching</span>
        Live map is waiting for valid route coordinates.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#07111f]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-500/10 border-b border-cyan-400/20">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse inline-block"></span>
          <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
            Live Tracking
          </p>
          {tracking?.deliveryAgentName && (
            <span className="ml-2 text-xs text-slate-400 font-semibold">
              · Agent: <span className="text-cyan-200">{tracking.deliveryAgentName}</span>
            </span>
          )}
        </div>
        {eta && (
          <span className="text-xs font-black text-cyan-200 uppercase tracking-widest">
            {eta}
          </span>
        )}
      </div>

      {/* Map */}
      <div style={{ height: "300px" }}>
        <MapContainer
          style={{ height: "300px", width: "100%" }}
          center={center}
          zoom={14}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="CartoDB"
          />
          {currentPoint && (
            <Marker position={currentPoint} icon={agentIcon}>
              <Popup>Agent: {tracking?.deliveryAgentName || "On the way"}</Popup>
            </Marker>
          )}
          {destinationPoint && (
            <Marker position={destinationPoint} icon={destinationIcon}>
              <Popup>Your delivery address</Popup>
            </Marker>
          )}
          {linePoints.length === 2 && (
            <Polyline positions={linePoints} color="#00bcd4" weight={4} dashArray="6 4" />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveMapEmbed;
