import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

/* ── Google Maps-style popup CSS ────────────────────────────────────────── */
const HERO_POPUP_CSS = `
  .hero-map-popup .leaflet-popup-content-wrapper {
    background: rgba(15,23,42,0.96);
    border: 1px solid rgba(99,102,241,0.35);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    padding: 0;
    overflow: hidden;
    min-width: 200px;
    backdrop-filter: blur(12px);
  }
  .hero-map-popup .leaflet-popup-content { margin: 0; padding: 0; }
  .hero-map-popup .leaflet-popup-tip-container { display: none; }
  .hero-map-popup .leaflet-popup-close-button {
    color: #94a3b8 !important; font-size: 18px !important;
    top: 8px !important; right: 10px !important; z-index: 10;
  }
  .hero-map-popup .leaflet-popup-close-button:hover { color: #fff !important; }
  .hpcard { font-family: system-ui, sans-serif; }
  .hpcard-head { padding: 11px 14px 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .hpcard-title { font-size: 13px; font-weight: 800; color: #e2e8f0; margin: 0 0 2px; }
  .hpcard-sub   { font-size: 11px; color: #64748b; margin: 0; }
  .hpcard-body  { padding: 8px 14px 11px; }
  .hpcard-row   { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;
                  font-size: 11.5px; color: #94a3b8; line-height: 1.4; }
  .hpcard-icon  { flex-shrink: 0; font-size: 12px; margin-top: 1px; }
  .hpcard-badge { display: inline-block; border-radius: 6px; padding: 1px 8px;
                  font-size: 10px; font-weight: 700; letter-spacing: .05em;
                  text-transform: uppercase; margin-top: 5px; }
  .hpcard-badge.cyan   { background: rgba(6,182,212,.15); color: #06b6d4; }
  .hpcard-badge.green  { background: rgba(34,197,94,.15);  color: #22c55e; }
  .hpcard-badge.violet { background: rgba(139,92,246,.15); color: #a78bfa; }
`;

function InjectHeroPopupStyles() {
  useEffect(() => {
    const id = "hero-map-popup-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = HERO_POPUP_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

const userIcon = L.divIcon({
  className: "hero-user-marker-shell",
  html: '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:13px;background:#00bcd4;color:#02151a;font-size:12px;font-weight:900;border:2px solid #083244;">YOU</span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const agentIcon = L.divIcon({
  className: "hero-agent-marker-shell",
  html: '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:14px;background:#22c55e;color:#052e16;font-size:16px;font-weight:900;border:2px solid #14532d;">🛵</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});



/* Non-passive wheel zoom for the Hero map */
const WheelZoomController = () => {
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
};

const MapViewportController = ({ userLocation, agentLocation }) => {
  const map = useMap();

  useEffect(() => {
    const userPoint =
      userLocation?.lat != null && userLocation?.lng != null
        ? [Number(userLocation.lat), Number(userLocation.lng)]
        : null;
    const agentPoint =
      agentLocation?.lat != null && agentLocation?.lng != null
        ? [Number(agentLocation.lat), Number(agentLocation.lng)]
        : null;

    const allPoints = [userPoint, agentPoint].filter(Boolean);

    if (allPoints.length >= 2) {
      map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 14, animate: true });
      return;
    }

    if (allPoints.length === 1) {
      map.setView(allPoints[0], 13, { animate: true });
    }
  }, [
    map,
    userLocation?.lat,
    userLocation?.lng,
    agentLocation?.lat,
    agentLocation?.lng,
  ]);

  return null;
};

const Hero = ({ hasActiveTracking = false, agentLocation = null }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("loading");

  const handleSearch = (event) => {
    event?.preventDefault?.();
    const term = String(query || "").trim();
    if (!term) return;
    navigate(`/categories?search=${encodeURIComponent(term)}`);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return undefined;
    }

    let bestAccuracy = Infinity;
    let hasInitialPosition = false;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number(position.coords.accuracy || 999999);

        // Reject wildly inaccurate IP-based fallback positions (>20km = useless)
        if (accuracy > 20000) {
          console.log(`[GPS Hero] Rejected IP-fallback position: ${accuracy.toFixed(0)}m`);
          return;
        }

        const newLocation = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy,
        };

        // Always accept first position for quick display
        if (!hasInitialPosition) {
          hasInitialPosition = true;
          bestAccuracy = accuracy;
          console.log(`[GPS Hero] Initial position: ${accuracy.toFixed(0)}m accuracy`, newLocation);
          setUserLocation(newLocation);
          setLocationStatus("ready");
          return;
        }

        // Log every position attempt
        console.log(`[GPS Hero] New position received: ${accuracy.toFixed(0)}m accuracy (best so far: ${bestAccuracy.toFixed(0)}m)`);

        // Update only if accuracy improves
        if (accuracy < bestAccuracy) {
          const improvement = bestAccuracy - accuracy;
          bestAccuracy = accuracy;
          console.log(`[GPS Hero] ✅ Better accuracy! Improved by ${improvement.toFixed(0)}m → Now ${accuracy.toFixed(0)}m`);
          setUserLocation(newLocation);
        } else {
          console.log(`[GPS Hero] ⏭️ Skipped - no improvement (${accuracy.toFixed(0)}m vs best ${bestAccuracy.toFixed(0)}m)`);
        }
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,  // Force fresh readings for continuous refinement
        timeout: 30000,  // Give 30s for GPS to achieve good lock
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const mapCenter = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (agentLocation?.lat != null && agentLocation?.lng != null) {
      return [Number(agentLocation.lat), Number(agentLocation.lng)];
    }
    return [22.5726, 88.3639];
  }, [userLocation, agentLocation?.lat, agentLocation?.lng]);

  return (
    <section className="relative overflow-hidden bg-white dark:bg-background-dark">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-12 py-12 lg:py-24">
          {/* Left Content */}
          <div className="flex-1 flex flex-col items-start gap-8 text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20 animate-fade-in">
              <span className="size-2 rounded-full bg-primary animate-pulse"></span>
              Trusted by 2M+ Users
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tight">
              Your Medicines.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-blue-500">
                Delivered Fast.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed font-medium">
              Get your prescriptions and wellness products delivered to your
              doorstep with speed, care, and absolute privacy.
            </p>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="w-full max-w-xl group">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
                <label className="flex items-center h-14 sm:h-16 w-full">
                  <div className="pl-4 sm:pl-6 text-slate-400">
                    <span className="material-symbols-outlined text-2xl">
                      search
                    </span>
                  </div>
                  <input
                    className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 text-lg px-4 sm:px-6"
                    placeholder="Search medicines or symptoms..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                  />
                  <button
                    type="submit"
                    className="hidden sm:block mr-2 h-12 px-8 bg-primary hover:bg-primary-hover text-white font-black rounded-xl transition-all shadow-lg shadow-primary/25"
                  >
                    Search
                  </button>
                </label>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 w-full sm:w-auto">
              <button
                onClick={() => navigate("/categories")}
                className="flex-1 sm:flex-none h-14 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 group"
              >
                <span>Browse Medicines</span>
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
              <button
                onClick={() => navigate("/prescriptions")}
                className="flex-1 sm:flex-none h-14 px-8 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-700 hover:border-primary dark:hover:border-primary font-black rounded-2xl transition-all flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined text-2xl text-primary">
                  upload_file
                </span>
                <span>Upload Rx</span>
              </button>
            </div>
          </div>

          {/* Right Side: Live Map */}
          <div className="flex-1 w-full relative">
            <div className="relative w-full aspect-[4/3] lg:aspect-square max-h-[600px] rounded-[32px] overflow-hidden shadow-2xl shadow-slate-900/10 dark:shadow-black/30 border border-slate-100 dark:border-slate-700">
              <MapContainer
                center={mapCenter}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <WheelZoomController />
                <InjectHeroPopupStyles />

                <MapViewportController
                  userLocation={userLocation}
                  agentLocation={
                    hasActiveTracking
                      ? {
                          lat: Number(agentLocation?.lat),
                          lng: Number(agentLocation?.lng),
                        }
                      : null
                  }
                />

                {userLocation ? (
                  <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={userIcon}
                  >
                    <Popup className="hero-map-popup" maxWidth={240}>
                      <div className="hpcard">
                        <div className="hpcard-head">
                          <p className="hpcard-title">📍 Your Location</p>
                          <p className="hpcard-sub">Live GPS position</p>
                        </div>
                        <div className="hpcard-body">
                          <div className="hpcard-row">
                            <span className="hpcard-icon">🌐</span>
                            <span style={{fontSize:'10px',opacity:.7}}>
                              {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                            </span>
                          </div>
                          {userLocation.accuracy > 0 && (
                            <div className="hpcard-row">
                              <span className="hpcard-icon">🎯</span>
                              <span>Accuracy ~{Math.round(userLocation.accuracy)} m</span>
                            </div>
                          )}
                          <span className="hpcard-badge violet">You are here</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : null}

                {hasActiveTracking &&
                agentLocation?.lat != null &&
                agentLocation?.lng != null ? (
                  <Marker
                    position={[
                      Number(agentLocation.lat),
                      Number(agentLocation.lng),
                    ]}
                    icon={agentIcon}
                  >
                    <Popup className="hero-map-popup" maxWidth={240}>
                      <div className="hpcard">
                        <div className="hpcard-head">
                          <p className="hpcard-title">🛵 Delivery Agent</p>
                          <p className="hpcard-sub">SwiftPharma Rider</p>
                        </div>
                        <div className="hpcard-body">
                          <div className="hpcard-row">
                            <span className="hpcard-icon">📦</span>
                            <span>Your order is on the way</span>
                          </div>
                          <div className="hpcard-row">
                            <span className="hpcard-icon">📡</span>
                            <span style={{fontSize:'10px',opacity:.7}}>
                              {Number(agentLocation.lat).toFixed(5)}, {Number(agentLocation.lng).toFixed(5)}
                            </span>
                          </div>
                          <span className="hpcard-badge green">Live tracking</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : null}


              </MapContainer>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10"></div>

              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500] rounded-2xl border border-white/30 bg-white/85 p-3 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Live location
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {locationStatus === "ready" && userLocation
                    ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`
                    : locationStatus === "loading"
                      ? "Detecting your location..."
                      : "Location access unavailable"}
                </p>
                {locationStatus === "ready" && userLocation ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {userLocation.accuracy <= 50
                      ? `📍 High accuracy (±${Math.round(userLocation.accuracy)}m)`
                      : userLocation.accuracy <= 200
                        ? `📍 Approx location (±${Math.round(userLocation.accuracy)}m)`
                        : `📍 Estimated location (±${Math.round(userLocation.accuracy)}m) — use mobile for better accuracy`}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Decorative Blobs */}
            <div className="absolute -top-12 -right-12 size-64 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>
            <div className="absolute -bottom-12 -left-12 size-64 bg-blue-400/20 rounded-full blur-[100px] -z-10 animate-pulse delay-1000"></div>
          </div>
        </div>

        {/* Trust Strip */}
        <div className="hidden lg:flex items-center justify-center gap-10 py-8 border-t border-slate-100 dark:border-slate-800">
          {[
            { icon: "verified", label: "Verified Pharmacies" },
            { icon: "lock", label: "Secure Checkout" },
            { icon: "support_agent", label: "24/7 Consultation" },
            { icon: "local_shipping", label: "Pan-India Delivery" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 text-slate-400 hover:text-primary transition-colors group cursor-default"
            >
              <span
                className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              <span className="text-xs font-semibold tracking-wide">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
