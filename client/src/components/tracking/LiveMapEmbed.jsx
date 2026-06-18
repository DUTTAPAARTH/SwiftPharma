import { useEffect, useMemo, useState } from "react";
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
import { fetchOrderTracking } from "../../services/trackingService";

/* ─── Leaflet default icon fix ────────────────────────────────────────────── */
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/* ─── Custom marker icons ───────────────────────────────────────────────────*/
const makeIcon = (bg, border, shadow, label) =>
  L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${bg};color:#fff;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;border:3px solid ${border};box-shadow:0 0 14px ${shadow};font-family:sans-serif;">${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

const agentIcon       = makeIcon("#06b6d4", "#164e63", "#06b6d466", "🚴");
const destinationIcon = makeIcon("#f97316", "#7c2d12", "#f9731666", "📍");
const storeIcon       = makeIcon("#10b981", "#065f46", "#10b98166", "💊");

/* ─── Google-Maps-style popup CSS ──────────────────────────────────────────*/
const POPUP_CSS = `
  .swiftpharma-popup .leaflet-popup-content-wrapper {
    background: #0f172a;
    border: 1px solid rgba(6,182,212,0.3);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    padding: 0;
    overflow: hidden;
    min-width: 220px;
  }
  .swiftpharma-popup .leaflet-popup-content {
    margin: 0;
    padding: 0;
  }
  .swiftpharma-popup .leaflet-popup-tip-container { display: none; }
  .swiftpharma-popup .leaflet-popup-close-button {
    color: #94a3b8 !important;
    font-size: 18px !important;
    top: 8px !important;
    right: 10px !important;
    z-index: 10;
  }
  .swiftpharma-popup .leaflet-popup-close-button:hover { color: #fff !important; }
  .sp-card { font-family: system-ui, sans-serif; }
  .sp-card-header {
    padding: 12px 14px 8px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sp-card-title {
    font-size: 13px;
    font-weight: 800;
    color: #e2e8f0;
    letter-spacing: 0.02em;
    margin: 0 0 2px;
  }
  .sp-card-sub {
    font-size: 11px;
    color: #64748b;
    margin: 0;
  }
  .sp-card-body { padding: 8px 14px 12px; }
  .sp-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 5px;
    font-size: 11.5px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .sp-row-icon { flex-shrink: 0; font-size: 12px; margin-top: 1px; }
  .sp-badge {
    display: inline-block;
    background: rgba(6,182,212,0.15);
    color: #06b6d4;
    border-radius: 6px;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-top: 6px;
  }
  .sp-badge.orange { background:rgba(249,115,22,0.15); color:#f97316; }
  .sp-badge.green  { background:rgba(16,185,129,0.15);  color:#10b981; }
`;

/* ─── Inject popup CSS once ─────────────────────────────────────────────── */
function InjectPopupStyles() {
  useEffect(() => {
    const id = "sp-popup-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = POPUP_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ─── Non-passive wheel zoom (bypasses Leaflet 1.9 passive handler) ─────── */
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

/* ─── Auto-fit bounds to show all markers ──────────────────────────────── */
function FitBounds({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    const valid = points.filter(Boolean);
    if (!valid.length) return;
    if (valid.length === 1) { map.setView(valid[0], 14, { animate: true }); return; }
    map.fitBounds(L.latLngBounds(valid), { padding: [55, 55], maxZoom: 15, animate: true });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const formatEta = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "Arriving shortly";
  const mins = Math.ceil(diffMs / 60000);
  return `${mins} min`;
};

const toValidPoint = (location) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
};

const fmtCoords = (pt) =>
  pt ? `${pt[0].toFixed(4)}, ${pt[1].toFixed(4)}` : "";

const fmtTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/* ─── Popup card builders ───────────────────────────────────────────────── */
const agentPopupHTML = (name, eta, coords, updatedAt) => `
  <div class="sp-card">
    <div class="sp-card-header">
      <p class="sp-card-title">🚴 Delivery Agent</p>
      <p class="sp-card-sub">Live location</p>
    </div>
    <div class="sp-card-body">
      ${name ? `<div class="sp-row"><span class="sp-row-icon">👤</span><span>${name}</span></div>` : ""}
      ${eta ? `<div class="sp-row"><span class="sp-row-icon">⏱</span><span>ETA: <strong style="color:#e2e8f0">${eta}</strong></span></div>` : ""}
      ${coords ? `<div class="sp-row"><span class="sp-row-icon">📡</span><span style="font-size:10px;opacity:.7">${coords}</span></div>` : ""}
      ${updatedAt ? `<div class="sp-row"><span class="sp-row-icon">🔄</span><span style="font-size:10px;opacity:.6">Updated ${updatedAt}</span></div>` : ""}
      <span class="sp-badge">On the way</span>
    </div>
  </div>`;

const destinationPopupHTML = (address, coords) => `
  <div class="sp-card">
    <div class="sp-card-header">
      <p class="sp-card-title">📍 Delivery Address</p>
      <p class="sp-card-sub">Your location</p>
    </div>
    <div class="sp-card-body">
      ${address ? `<div class="sp-row"><span class="sp-row-icon">🏠</span><span>${address}</span></div>` : ""}
      ${coords ? `<div class="sp-row"><span class="sp-row-icon">🗺</span><span style="font-size:10px;opacity:.7">${coords}</span></div>` : ""}
      <span class="sp-badge orange">Destination</span>
    </div>
  </div>`;

const storePopupHTML = (coords) => `
  <div class="sp-card">
    <div class="sp-card-header">
      <p class="sp-card-title">💊 SwiftPharma Store</p>
      <p class="sp-card-sub">Dispatch origin · Kolkata, WB</p>
    </div>
    <div class="sp-card-body">
      <div class="sp-row"><span class="sp-row-icon">🏥</span><span>SwiftPharma Central Pharmacy</span></div>
      <div class="sp-row"><span class="sp-row-icon">🕐</span><span>Open 24 × 7</span></div>
      <div class="sp-row"><span class="sp-row-icon">📞</span><span>1800-XXX-PHARMA</span></div>
      ${coords ? `<div class="sp-row"><span class="sp-row-icon">📡</span><span style="font-size:10px;opacity:.7">${coords}</span></div>` : ""}
      <span class="sp-badge green">Verified Pharmacy</span>
    </div>
  </div>`;

/* ─── SwiftPharma store location (Kolkata center – matches simulator origin) */
const STORE_POINT = [22.5726, 88.3639];

/* ══════════════════════════════════════════════════════════════════════════ */
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
    return () => { mounted = false; clearInterval(timer); };
  }, [orderId]);

  const tracking   = payload?.tracking;
  const currentPoint     = useMemo(() => toValidPoint(tracking?.currentLocation), [tracking]);
  const destinationPoint = useMemo(() => toValidPoint(tracking?.destinationLocation), [tracking]);
  const eta        = formatEta(tracking?.estimatedDeliveryTime);
  const allPoints  = [currentPoint, destinationPoint, STORE_POINT];
  const linePoints = currentPoint && destinationPoint ? [currentPoint, destinationPoint] : [];

  /* ── Loading ── */
  if (loading) return (
    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-[#07111f] h-48 flex items-center justify-center">
      <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest animate-pulse">Loading live map…</p>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 px-5 py-4 text-sm text-slate-400">
      <span className="material-symbols-outlined text-sm align-middle mr-2">location_off</span>
      Live map not available yet — agent location will appear once dispatched.
    </div>
  );

  /* ── No coords ── */
  if (!currentPoint && !destinationPoint) return (
    <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/50 px-5 py-4 text-sm text-slate-400">
      <span className="material-symbols-outlined text-sm align-middle mr-2">location_searching</span>
      Live map is waiting for valid route coordinates.
    </div>
  );

  return (
    <div className="mt-6 rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#07111f]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-500/10 border-b border-cyan-400/20">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
          <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Live Tracking</p>
          {tracking?.deliveryAgentName && (
            <span className="ml-2 text-xs text-slate-400 font-semibold">
              · Agent: <span className="text-cyan-200">{tracking.deliveryAgentName}</span>
            </span>
          )}
        </div>
        {eta && <span className="text-xs font-black text-cyan-200 uppercase tracking-widest">ETA {eta}</span>}
      </div>

      {/* ── Hint ── */}
      <div className="px-4 py-1 bg-cyan-950/30 text-[10px] text-cyan-400/50 text-center tracking-wide">
        Click any marker for details &nbsp;·&nbsp; Scroll to zoom
      </div>

      {/* ── Map ── */}
      <div style={{ height: "360px" }}>
        <MapContainer
          style={{ height: "360px", width: "100%" }}
          center={currentPoint || destinationPoint || STORE_POINT}
          zoom={13}
          scrollWheelZoom={false}
          zoomControl={true}
          attributionControl={false}
        >
          <InjectPopupStyles />
          <WheelZoomController />
          <FitBounds points={allPoints} />

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="CartoDB"
          />

          {/* SwiftPharma store marker */}
          <Marker position={STORE_POINT} icon={storeIcon}>
            <Popup className="swiftpharma-popup" maxWidth={260}>
              <div dangerouslySetInnerHTML={{ __html: storePopupHTML(fmtCoords(STORE_POINT)) }} />
            </Popup>
          </Marker>

          {/* Delivery agent marker */}
          {currentPoint && (
            <Marker position={currentPoint} icon={agentIcon}>
              <Popup className="swiftpharma-popup" maxWidth={260}>
                <div dangerouslySetInnerHTML={{ __html: agentPopupHTML(
                  tracking?.deliveryAgentName,
                  eta,
                  fmtCoords(currentPoint),
                  fmtTime(tracking?.currentLocation?.updatedAt),
                )}} />
              </Popup>
            </Marker>
          )}

          {/* Destination marker */}
          {destinationPoint && (
            <Marker position={destinationPoint} icon={destinationIcon}>
              <Popup className="swiftpharma-popup" maxWidth={260}>
                <div dangerouslySetInnerHTML={{ __html: destinationPopupHTML(
                  payload?.deliveryAddress,
                  fmtCoords(destinationPoint),
                )}} />
              </Popup>
            </Marker>
          )}

          {/* Route line */}
          {linePoints.length === 2 && (
            <Polyline positions={linePoints} color="#06b6d4" weight={3} dashArray="8 5" opacity={0.7} />
          )}
        </MapContainer>
      </div>

      {/* ── Footer legend ── */}
      <div className="flex items-center justify-center gap-5 px-4 py-2 bg-slate-900/60 text-[10px] text-slate-400 border-t border-slate-800">
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-emerald-400" />Store</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-cyan-400" />Agent</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-orange-400" />Your address</span>
      </div>
    </div>
  );
};

export default LiveMapEmbed;
