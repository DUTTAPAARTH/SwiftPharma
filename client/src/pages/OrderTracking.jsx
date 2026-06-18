import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { fetchOrderTracking } from "../services/trackingService";

/* ── Google Maps-style popup CSS ─────────────────────────────────────────── */
const OT_POPUP_CSS = `
  .ot-popup .leaflet-popup-content-wrapper {
    background: rgba(13,20,36,0.97);
    border: 1px solid rgba(6,182,212,0.3);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
    padding: 0; overflow: hidden; min-width: 210px;
  }
  .ot-popup .leaflet-popup-content { margin: 0; padding: 0; }
  .ot-popup .leaflet-popup-tip-container { display: none; }
  .ot-popup .leaflet-popup-close-button {
    color: #94a3b8 !important; font-size: 18px !important;
    top: 8px !important; right: 10px !important; z-index: 10;
  }
  .ot-popup .leaflet-popup-close-button:hover { color: #fff !important; }
  .otcard { font-family: system-ui, sans-serif; }
  .otcard-head { padding: 10px 14px 7px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .otcard-title { font-size: 13px; font-weight: 800; color: #e2e8f0; margin: 0 0 2px; }
  .otcard-sub   { font-size: 11px; color: #64748b; margin: 0; }
  .otcard-body  { padding: 7px 14px 11px; }
  .otcard-row   { display: flex; gap: 6px; margin-bottom: 4px; font-size: 11.5px; color: #94a3b8; line-height: 1.4; }
  .otcard-badge { display: inline-block; border-radius: 6px; padding: 1px 8px;
                  font-size: 10px; font-weight: 700; letter-spacing:.05em; text-transform: uppercase; margin-top: 5px; }
  .otcard-badge.cyan   { background: rgba(6,182,212,.15); color: #06b6d4; }
  .otcard-badge.orange { background: rgba(249,115,22,.15); color: #f97316; }
`;

function InjectOTPopupStyles() {
  useEffect(() => {
    const id = "ot-popup-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = OT_POPUP_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const agentIcon = L.divIcon({
  className: "tracking-agent-icon",
  html: '<div style="width:30px;height:30px;border-radius:15px;background:#00bcd4;color:#02151a;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #083244;">A</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const destinationIcon = L.divIcon({
  className: "tracking-destination-icon",
  html: '<div style="width:30px;height:30px;border-radius:15px;background:#f97316;color:#1f1301;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #7c2d12;">D</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const isDelivered = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") === "delivered";

const formatEta = (value) => {
  if (!value) return "ETA unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ETA unavailable";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "Arriving shortly";
  const mins = Math.ceil(diffMs / 60000);
  return `${mins} min`;
};

const formatTrackingLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const map = {
    injection: "Order Placed",
    verification: "Order Confirmed",
    sterile_prep: "Being Prepared",
    packed: "Packed & Ready",
    transit: "Out for Delivery",
    dispatch: "Dispatched",
    fulfillment: "Delivered",
    order_placed: "Order Placed",
    order_confirmed: "Order Confirmed",
    being_prepared: "Being Prepared",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    agent_assigned: "Dispatched",
    location_update: "Out for Delivery",
    dispatch_note: "Dispatched",
  };

  return map[normalized] || String(value || "Update");
};

/* Non-passive wheel zoom — bypasses Leaflet 1.9 passive handler */
function WheelZoomController() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    map.scrollWheelZoom.disable();
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) map.zoomIn(1, { animate: true });
      else map.zoomOut(1, { animate: true });
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [map]);
  return null;
}

/* Auto-fit to show all markers */
function FitBounds({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    const valid = points.filter(Boolean);
    if (!valid.length) return;
    if (valid.length === 1) { map.setView(valid[0], 14, { animate: true }); return; }
    map.fitBounds(L.latLngBounds(valid), { padding: [50, 50], maxZoom: 15, animate: true });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const toValidPoint = (location) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
};

const OrderTracking = () => {
  const { orderId } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    let mounted = true;

    const load = async (withLoader = false) => {
      if (withLoader) setLoading(true);
      try {
        const { data } = await fetchOrderTracking(orderId);
        if (!mounted) return;
        setPayload(data);
        setError("");
      } catch (err) {
        if (!mounted) return;
        const message = err?.response?.data?.message || "Tracking unavailable";
        setError(message);
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

  const agentLat = Number(
    currentPoint?.[0] || destinationPoint?.[0] || 22.5726,
  );
  const agentLng = Number(
    currentPoint?.[1] || destinationPoint?.[1] || 88.3639,
  );
  const linePoints =
    currentPoint && destinationPoint ? [currentPoint, destinationPoint] : [];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 font-nexus-bold">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-32">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Live Order Tracking
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">
              Order #
              {String(orderId || "")
                .slice(-8)
                .toUpperCase()}
            </h1>
          </div>
          <Link
            to="/orders"
            className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-500/25"
          >
            Back to Orders
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-8 text-center text-cyan-200">
            Loading live tracking...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
            {error}
          </div>
        ) : !currentPoint && !destinationPoint ? (
          <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-8 text-center text-slate-300">
            Live map is not ready yet. Route coordinates will appear once dispatch tracking starts.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="overflow-hidden rounded-3xl border border-[#1a2540] bg-[#0d1424] p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Delivery Map
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  {isDelivered(payload?.status)
                    ? "Delivered"
                    : `ETA ${formatEta(tracking?.estimatedDeliveryTime)}`}
                </p>
              </div>

              <div className="h-[460px] rounded-2xl border border-[#1f2a46] overflow-hidden">
                <MapContainer
                  style={{ height: "460px", width: "100%" }}
                  center={[agentLat, agentLng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  zoomControl={true}
                  attributionControl={false}
                >
                  <WheelZoomController />
                  <InjectOTPopupStyles />
                  <FitBounds points={[currentPoint, destinationPoint].filter(Boolean)} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="CartoDB"
                  />

                  {currentPoint && (
                    <Marker position={currentPoint} icon={agentIcon}>
                      <Popup className="ot-popup" maxWidth={250}>
                        <div className="otcard">
                          <div className="otcard-head">
                            <p className="otcard-title">🚴 Delivery Agent</p>
                            <p className="otcard-sub">Live location</p>
                          </div>
                          <div className="otcard-body">
                            {tracking?.deliveryAgentName && (
                              <div className="otcard-row"><span>👤</span><span>{tracking.deliveryAgentName}</span></div>
                            )}
                            <div className="otcard-row"><span>⏱</span><span>ETA: <strong style={{color:"#e2e8f0"}}>{formatEta(tracking?.estimatedDeliveryTime)}</strong></span></div>
                            <div className="otcard-row"><span style={{fontSize:'10px',opacity:.6}}>📡 {currentPoint[0].toFixed(4)}, {currentPoint[1].toFixed(4)}</span></div>
                            <span className="otcard-badge cyan">On the way</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {destinationPoint && (
                    <Marker position={destinationPoint} icon={destinationIcon}>
                      <Popup className="ot-popup" maxWidth={250}>
                        <div className="otcard">
                          <div className="otcard-head">
                            <p className="otcard-title">📍 Delivery Address</p>
                            <p className="otcard-sub">Your location</p>
                          </div>
                          <div className="otcard-body">
                            {payload?.deliveryAddress && (
                              <div className="otcard-row"><span>🏠</span><span>{payload.deliveryAddress}</span></div>
                            )}
                            <div className="otcard-row"><span style={{fontSize:'10px',opacity:.6}}>🗺 {destinationPoint[0].toFixed(4)}, {destinationPoint[1].toFixed(4)}</span></div>
                            <span className="otcard-badge orange">Destination</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {linePoints.length === 2 && (
                    <Polyline positions={linePoints} color="#00bcd4" weight={3} dashArray="8 5" opacity={0.8} />
                  )}
                </MapContainer>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Delivery Details
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Agent:{" "}
                  <span className="font-bold text-cyan-200">
                    {tracking?.deliveryAgentName || "Awaiting assignment"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Address:{" "}
                  <span className="font-semibold text-white">
                    {payload?.deliveryAddress || "N/A"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Updated:{" "}
                  {tracking?.currentLocation?.updatedAt
                    ? new Date(
                        tracking.currentLocation.updatedAt,
                      ).toLocaleTimeString("en-IN")
                    : "-"}
                </p>
                {isDelivered(payload?.status) ? (
                  <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-200">
                    Delivered successfully
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Tracking Timeline
                </p>
                <ol className="mt-3 space-y-3">
                  {(tracking?.statusHistory || [])
                    .slice()
                    .reverse()
                    .map((evt, idx) => (
                      <li
                        key={`${evt.timestamp}-${idx}`}
                        className="rounded-xl border border-[#1f2a46] bg-[#0a0f1e] p-3"
                      >
                        <p className="text-sm font-bold text-cyan-200">
                          {formatTrackingLabel(evt.status)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {evt.description || "Location updated"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {evt.timestamp
                            ? new Date(evt.timestamp).toLocaleString("en-IN")
                            : ""}
                        </p>
                      </li>
                    ))}
                </ol>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderTracking;
