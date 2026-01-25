import React, { useMemo, useState, useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import CategoryCard from "../components/cards/CategoryCard";
import { fetchCategories } from "../services/productService";

const Categories = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });

  const filters = [
    { key: "all", label: "All" },
    { key: "Rx", label: "Prescription" },
    { key: "OTC", label: "OTC" },
  ];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const data = await fetchCategories();
        const categoriesWithDefaults = (data || []).map((cat, idx) => ({
          id: cat._id,
          name: cat.name,
          description: cat.description || "Premium medicines",
          productCount: cat.productCount || 0,
          icon: "💊",
          rxType: "OTC", // Default, could be enhanced from backend
        }));
        setCategories(categoriesWithDefaults);
        setError(null);
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("Failed to load categories");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    if (selectedFilter === "all") return categories;
    return categories.filter((cat) => {
      if (selectedFilter === "OTC") return cat.rxType === "OTC";
      if (selectedFilter === "Rx") return cat.rxType === "Rx";
      return true;
    });
  }, [selectedFilter, categories]);

  const handleHeroMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const offsetY = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    setHeroTilt({ x: offsetX, y: offsetY });
  };

  const handleHeroLeave = () => setHeroTilt({ x: 0, y: 0 });

  return (
    <div className="min-h-screen bg-background text-primary-text">
      <Navbar />
      <main className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 space-y-16">
        {/* Hero Section */}
        <section
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero shadow-[0_10px_35px_rgba(0,0,0,0.05)] px-8 md:px-12 lg:px-16 py-12 md:py-16"
          onMouseMove={handleHeroMove}
          onMouseLeave={handleHeroLeave}
        >
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-7 text-center md:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border text-primary-text font-semibold shadow-soft text-sm">
                🏥 Medical Categories
              </span>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-nexus-bold leading-tight text-primary-text">
                  Browse by{" "}
                  <span className="gradient-text">Health Category</span>
                </h1>
                <p className="text-lg text-secondary-text font-roserri max-w-2xl leading-relaxed">
                  Discover medicines and wellness products organized by health
                  needs. Clear Rx/OTC labels, verified pharmacy partners, and
                  express delivery.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-3 justify-center md:justify-start">
                {filters.map((pill) => {
                  const active = pill.key === selectedFilter;
                  return (
                    <button
                      key={pill.key}
                      onClick={() => setSelectedFilter(pill.key)}
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-300 shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-coral focus:ring-offset-2 focus:ring-offset-white ${
                        active
                          ? "bg-gradient-brand text-white border-brand-coral shadow-glow"
                          : "bg-white text-primary-text border-border hover:-translate-y-1 hover:shadow-card"
                      }`}
                      aria-pressed={active}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side: 3D Illustration with Glassmorphism */}
            <div className="relative h-72 md:h-80 lg:h-96 hidden md:flex items-center justify-center">
              <div
                className="parallax-blob absolute inset-0 rounded-3xl bg-gradient-to-br from-[#FFE8E2] via-[#FFF4F2] to-[#F7F6F4] opacity-60"
                style={{
                  transform: `translate(${heroTilt.x}px, ${heroTilt.y}px)`,
                }}
              ></div>
              <div className="absolute inset-8 rounded-3xl glass-container shadow-lifted flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 px-8 py-6 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFF4F2] to-[#FFE8E2] border border-[#FFD4CC] flex items-center justify-center text-5xl shadow-glow">
                    💊
                  </div>
                  <div>
                    <p className="text-sm text-secondary-text font-roserri mb-1">
                      Explore curated
                    </p>
                    <p className="font-nexus-bold text-xl text-primary-text">
                      Medical Categories
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-nexus-bold text-primary-text">
                Medical Categories
              </h2>
              <p className="text-secondary-text font-roserri mt-2 text-base">
                Organized collections with clear Rx/OTC labels and verified
                suppliers
              </p>
            </div>
            <span className="text-sm text-secondary-text hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border shadow-soft">
              <span className="w-2 h-2 rounded-full bg-brand-coral"></span>
              {filteredCategories.length} available
            </span>
          </div>
          {loading ? (
            <div className="grid gap-8 md:gap-10 lg:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-border animate-pulse h-64"
                >
                  <div className="bg-gray-300 h-32 rounded-lg mb-4"></div>
                  <div className="bg-gray-300 h-4 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-300 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
              {error}. Please refresh the page or try again later.
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="grid gap-8 md:gap-10 lg:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((cat) => (
                <CategoryCard key={cat.id} {...cat} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              No categories found matching your filters
            </div>
          )}
        </section>

        {/* Feature Strip - Glassmorphism */}
        <section className="rounded-3xl glass-container shadow-card px-6 md:px-10 lg:px-12 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                icon: "⚡",
                text: "Smart category filters",
                gradient: "from-[#FFE8E2] to-[#FFF4F2]",
              },
              {
                icon: "✓",
                text: "Clear Rx/OTC labels",
                gradient: "from-[#E8F1FF] to-[#F0F6FF]",
              },
              {
                icon: "🔒",
                text: "Verified suppliers",
                gradient: "from-[#F0F9F4] to-[#E8F5EE]",
              },
              {
                icon: "🎁",
                text: "Category-wise offers",
                gradient: "from-[#F3ECFF] to-[#F8F4FF]",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} border border-border flex items-center justify-center text-xl shadow-soft flex-shrink-0`}
                >
                  {item.icon}
                </div>
                <p className="text-primary-text font-semibold leading-snug pt-1.5">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
