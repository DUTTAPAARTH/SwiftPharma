import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "./common/Button";

const Hero = ({ categories = [] }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (event) => {
    event?.preventDefault?.();
    const term = String(query || "").trim();
    if (!term) return;
    navigate(`/categories?search=${encodeURIComponent(term)}`);
  };

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

          {/* Right Side: Visual */}
          <div className="flex-1 w-full relative">
            <div className="relative w-full aspect-[4/3] lg:aspect-square max-h-[600px] rounded-[32px] overflow-hidden shadow-2xl shadow-slate-900/10 dark:shadow-black/30 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 z-10 pointer-events-none"></div>
              <img
                src="https://images.unsplash.com/photo-1576091160550-217359f49f4c?auto=format&fit=crop&q=80&w=1000"
                alt="Healthcare Professional"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay stat cards */}
              <div className="absolute top-5 right-5 z-20">
                <div className="backdrop-blur-xl bg-white/85 dark:bg-slate-900/85 px-4 py-3 rounded-2xl border border-white/30 shadow-lg flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-emerald-500 text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      Order Status
                    </p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Out for Delivery
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-5 left-5 right-5 z-20">
                <div className="backdrop-blur-xl bg-white/85 dark:bg-slate-900/85 px-5 py-4 rounded-2xl border border-white/30 shadow-lg flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                      Average Delivery
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      28 mins
                    </p>
                  </div>
                  <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      bolt
                    </span>
                  </div>
                </div>
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
