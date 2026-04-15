import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

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

    if (userPoint && agentPoint) {
      map.fitBounds([userPoint, agentPoint], {
        padding: [40, 40],
        maxZoom: 16,
      });
      return;
    }

    if (userPoint) {
      map.setView(userPoint, 15, { animate: true });
      return;
    }

    if (agentPoint) {
      map.setView(agentPoint, 14, { animate: true });
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

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy || 0),
        });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
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
                  />
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
                  />
                ) : null}
              </MapContainer>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10"></div>

              <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-2xl border border-white/30 bg-white/85 p-3 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85">
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
                    Accuracy approx {Math.round(userLocation.accuracy || 0)} m
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
