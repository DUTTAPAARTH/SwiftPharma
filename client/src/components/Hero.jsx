import React from "react";
import { Link } from "react-router-dom";
import Button from "./common/Button";

const Hero = () => (
  <section className="relative overflow-hidden bg-gradient-hero text-text-strong py-20 md:py-28 px-6 md:px-12 rounded-3xl shadow-lifted border border-border">
    {/* Soft gradient blob behind heading */}
    <div className="absolute inset-0 opacity-40">
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#FFB199] via-[#FF906A] to-[#FF6B4A] rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-[#F9E1F7] to-[#9270FF] rounded-full blur-3xl opacity-25"></div>
    </div>

    <div className="relative grid md:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
      {/* Left Content */}
      <div className="space-y-7">
        {/* Main Headline */}
        <div className="hero-heading-container">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight text-text-strong">
            <span className="hero-word">
              <span className="hero-char">M</span>
              <span className="hero-char">e</span>
              <span className="hero-char">d</span>
              <span className="hero-char">i</span>
              <span className="hero-char">c</span>
              <span className="hero-char">i</span>
              <span className="hero-char">n</span>
              <span className="hero-char">e</span>
            </span>{" "}
            <span className="hero-word">
              <span className="hero-char">D</span>
              <span className="hero-char">e</span>
              <span className="hero-char">l</span>
              <span className="hero-char">i</span>
              <span className="hero-char">v</span>
              <span className="hero-char">e</span>
              <span className="hero-char">r</span>
              <span className="hero-char">y</span>
            </span>
            <br />
            <span className="hero-word">
              <span className="hero-char">i</span>
              <span className="hero-char">n</span>
            </span>{" "}
            <span className="hero-word">
              <span className="hero-char gradient-text">M</span>
              <span className="hero-char gradient-text">i</span>
              <span className="hero-char gradient-text">n</span>
              <span className="hero-char gradient-text">u</span>
              <span className="hero-char gradient-text">t</span>
              <span className="hero-char gradient-text">e</span>
              <span className="hero-char gradient-text">s</span>
            </span>
          </h1>
          <div className="h-1.5 w-28 mt-6 bg-gradient-cta rounded-full shadow-glow"></div>
        </div>

        {/* Description */}
        <p className="text-text-muted text-lg md:text-xl max-w-xl leading-relaxed">
          Order prescription medicines, OTC products, and health essentials.
          Blinkit-style delivery across India — fast, verified, and secure.
        </p>

        {/* Search Bar with Glow */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            placeholder="Search medicines or symptoms..."
            className="flex-1 px-5 py-4 rounded-xl bg-white border-2 border-border text-text-strong placeholder-text-muted focus:outline-none focus:border-brand-coral focus:ring-4 focus:ring-brand-coral/10 focus:shadow-glow transition-all duration-300"
          />
          <Button variant="cta" className="whitespace-nowrap px-6 py-4">
            Search
          </Button>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 pt-2">
          <Link to="/categories">
            <button className="px-8 py-3.5 bg-gradient-cta text-white font-semibold rounded-xl hover:shadow-glow hover:scale-105 transition-all duration-300">
              Shop Medicines →
            </button>
          </Link>
          <Link to="/cart">
            <button className="px-8 py-3.5 bg-white border-2 border-border text-text-strong font-semibold rounded-xl hover:border-brand-coral hover:bg-gradient-to-r hover:from-white hover:to-[#FFF4F2] transition-all duration-300">
              View Cart
            </button>
          </Link>
        </div>
      </div>

      {/* Right Side: 3D Pill Illustration */}
      <div className="relative hidden md:flex items-center justify-center h-full">
        <div className="parallax-blob absolute inset-0 bg-gradient-to-br from-[#FFE0D1] via-[#FFF3EB] to-[#F9E1F7] rounded-3xl opacity-60"></div>
        <div className="relative w-full h-96 rounded-3xl glass-container shadow-lifted flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="pill-3d">
              <div className="pill-3d__main">
                <div className="pill-3d__glare"></div>
              </div>
              <div className="pill-3d__shadow"></div>
            </div>
            <div>
              <p className="text-sm text-text-muted font-medium mb-1">
                Fast delivery in
              </p>
              <p className="text-3xl font-serif font-bold text-text-strong">
                15-30 mins
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Badge Row - Glassmorphism */}
    <div className="relative mt-12 max-w-7xl mx-auto">
      <div className="backdrop-blur-xl bg-white/40 border border-white/20 shadow-md rounded-2xl p-6">
        <div className="flex flex-wrap justify-center md:justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFE8E2] to-[#FFF4F2] border border-white shadow-sm flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-strong">
                Express Delivery
              </p>
              <p className="text-xs text-text-muted">15-30 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E8F1FF] to-[#F0F6FF] border border-white shadow-sm flex items-center justify-center">
              <span className="text-xl">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-strong">Verified</p>
              <p className="text-xs text-text-muted">Licensed pharmacies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F3ECFF] to-[#F8F4FF] border border-white shadow-sm flex items-center justify-center">
              <span className="text-xl">🔒</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-strong">Secure</p>
              <p className="text-xs text-text-muted">Private & encrypted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
