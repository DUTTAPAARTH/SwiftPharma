import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/Hero";
import ProductCard from "../components/cards/ProductCard";
import { fetchProducts, fetchCategories } from "../services/productService";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryIcons = {
    Antibiotics: "💊",
    "Pain Relief": "🩹",
    "Cough & Cold": "🤧",
    "Digestive Health": "🫁",
    "Allergy Relief": "🧴",
    "Mental Health": "🧠",
    "Heart Health": "❤️",
    Wellness: "💪",
    Infections: "🦠",
    Respiratory: "💨",
    "General Medicine": "⚕️",
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts({ limit: 12 }),
          fetchCategories(),
        ]);
        console.log("Loaded products:", productsData);
        console.log(
          "Product names:",
          productsData?.map((p) => p.name),
        );
        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setError(null);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load medicines and categories");
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const displayCategories =
    categories.length > 0
      ? categories.map((cat) => ({
          icon: categoryIcons[cat.name] || "💊",
          name: cat.name,
          caption: cat.description || "Premium medicines",
          count: cat.productCount || 0,
        }))
      : [
          { icon: "💊", name: "Antibiotics", caption: "Prescription only" },
          { icon: "🩹", name: "Pain Relief", caption: "OTC available" },
          { icon: "💉", name: "Vitamins", caption: "Health boost" },
          { icon: "🫁", name: "Digestive", caption: "Gut health" },
          { icon: "🧴", name: "Skin Care", caption: "Derma care" },
          { icon: "🤧", name: "Cold & Cough", caption: "Quick relief" },
        ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-20">
        {/* Hero Section */}
        <div className="pt-6">
          <Hero />
        </div>

        {/* Category Section - App Store Style */}
        <section className="section-spacing">
          <div className="mb-10">
            <h2 className="text-4xl font-serif font-bold text-text-strong mb-3">
              Shop by Category
            </h2>
            <div className="h-1 w-24 bg-gradient-cta rounded-full"></div>
          </div>

          {/* Prescription Upload CTA */}
          <Link to="/prescriptions">
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
                  📋
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">
                    Upload Prescription
                  </h3>
                  <p className="text-white/90 text-sm">
                    Upload your prescription and AI will extract medicine
                    details automatically
                  </p>
                </div>
                <div className="hidden sm:block text-3xl">→</div>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {displayCategories.map((category, idx) => (
              <Link
                key={category.name}
                to={`/categories?category=${encodeURIComponent(category.name)}`}
              >
                <button className="w-full group relative bg-card-surface border border-border rounded-2xl p-5 text-center hover:shadow-lifted hover:translate-y-[-4px] hover:border-brand-coral transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-cta opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-5xl mb-3 transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 group-hover:-translate-y-2 group-hover:drop-shadow-lg">
                      {category.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-text-strong mb-1">
                      {category.name}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2">
                      {category.caption}
                    </p>
                    {typeof category.count === "number" ? (
                      <p className="text-[11px] text-text-muted mt-1">
                        {category.count} meds
                      </p>
                    ) : null}
                  </div>
                </button>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Medicines Section */}
        <section className="section-spacing">
          <div className="flex items-center justify-between mb-10 flex-wrap gap-6">
            <div>
              <h2 className="text-4xl font-serif font-bold text-text-strong mb-3">
                Popular Medicines
              </h2>
              <div className="h-1 w-24 bg-gradient-lavender rounded-full"></div>
            </div>
            <Link to="/categories">
              <button className="px-6 py-3 text-sm font-semibold text-text-strong border-2 border-border rounded-xl hover:border-brand-coral hover:bg-gradient-to-r hover:from-white hover:to-[#FFF4F2] transition-all duration-300">
                View All →
              </button>
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-card-surface rounded-2xl p-6 border border-border animate-pulse h-80"
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
          ) : products.length > 0 ? (
            <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((item) => (
                <ProductCard
                  key={item._id}
                  id={item._id}
                  name={item.name}
                  price={item.price}
                  requiresRx={item.requiresRx || false}
                  composition={item.composition}
                  manufacturer={item.manufacturer}
                  packSize={item.packSize}
                  rating={item.rating || 4.6}
                  popular={false}
                  fastDelivery={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              No medicines available at the moment
            </div>
          )}
        </section>

        {/* Offers Banner */}
        <section className="bg-gradient-special rounded-3xl p-10 md:p-16 shadow-lifted overflow-hidden relative border border-border">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-coral/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-lavender-accent/15 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-sm font-semibold text-brand-coral mb-6">
              🎉 Limited Time Offer
            </div>
            <h3 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-text-strong">
              Special Offer Today
            </h3>
            <p className="text-xl text-text-muted mb-8 leading-relaxed max-w-2xl mx-auto">
              Get 20% off on your first order + free express delivery. Use code{" "}
              <span className="font-bold text-brand-coral">SWIFT20</span> at
              checkout.
            </p>
            <Link to="/categories">
              <button className="px-10 py-4 text-base font-semibold bg-white text-brand-coral rounded-xl hover:shadow-lifted hover:scale-105 transition-all duration-300 border-2 border-white/40">
                Claim Offer →
              </button>
            </Link>
          </div>
        </section>

        {/* Advantage Section - Premium Feature Grid */}
        <section className="section-spacing">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-text-strong mb-4">
              Why Choose SwiftPharma
            </h2>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Premium healthcare delivery with industry-leading standards
            </p>
            <div className="h-1 w-24 bg-gradient-cta mx-auto mt-6 rounded-full"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {/* Feature 1 */}
            <div className="group bg-card-surface rounded-3xl border border-border text-center p-10 hover:shadow-xl hover:translate-y-[-4px] hover:border-brand-coral transition-all duration-300">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFE8E2] to-[#FFF4F2] rounded-2xl blur-sm opacity-70"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-[#FFF4F2] to-[#FFE8E2] rounded-2xl border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-4xl">⚡</div>
                </div>
              </div>
              <h4 className="text-2xl font-serif font-bold text-text-strong mb-4">
                Lightning Fast
              </h4>
              <p className="text-text-muted leading-relaxed text-base">
                Express delivery in 15-30 minutes across major cities. Emergency
                medicine support available 24/7.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-card-surface rounded-3xl border border-border text-center p-10 hover:shadow-xl hover:translate-y-[-4px] hover:border-brand-coral transition-all duration-300">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E8F1FF] to-[#F0F6FF] rounded-2xl blur-sm opacity-70"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-[#F0F6FF] to-[#E8F1FF] rounded-2xl border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-4xl">🛡️</div>
                </div>
              </div>
              <h4 className="text-2xl font-serif font-bold text-text-strong mb-4">
                Verified & Safe
              </h4>
              <p className="text-text-muted leading-relaxed text-base">
                Licensed pharmacies only. Every product verified,
                temperature-controlled storage, and quality assured.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-card-surface rounded-3xl border border-border text-center p-10 hover:shadow-xl hover:translate-y-[-4px] hover:border-brand-coral transition-all duration-300">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F3ECFF] to-[#F8F4FF] rounded-2xl blur-sm opacity-70"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-[#F8F4FF] to-[#F3ECFF] rounded-2xl border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-4xl">🔒</div>
                </div>
              </div>
              <h4 className="text-2xl font-serif font-bold text-text-strong mb-4">
                Your Privacy
              </h4>
              <p className="text-text-muted leading-relaxed text-base">
                End-to-end encryption for medical data. Prescriptions are
                private and handled with complete confidentiality.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="section-spacing bg-card-surface rounded-3xl p-10 md:p-16 shadow-card border border-border">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-text-strong mb-4">
              Loved by 100K+ Users
            </h2>
            <div className="h-1 w-24 bg-gradient-lavender mx-auto rounded-full"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Priya Sharma",
                text: "Got my asthma medication in 20 mins. Amazing service and professional delivery!",
                rating: 5,
              },
              {
                name: "Rajesh Kumar",
                text: "Trusted pharmacy partner. Very safe, discreet delivery with proper packaging.",
                rating: 5,
              },
              {
                name: "Meera Gupta",
                text: "Best medicine delivery app. Highly recommended for emergency needs!",
                rating: 5,
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-gradient-to-br from-background to-white border border-border hover:shadow-lifted hover:translate-y-[-2px] transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-[#FFB800] text-lg">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-text-muted text-base mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF4F2] to-[#FFE8E2] border border-border"></div>
                  <div>
                    <p className="font-semibold text-text-strong">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-text-muted">Verified Customer</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section - Signature Brand Gradient */}
        <section className="section-spacing">
          <div className="bg-gradient-brand rounded-3xl p-12 md:p-20 text-center shadow-lifted border border-border overflow-hidden relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h3 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-white">
                Ready for Fast Medicine Delivery?
              </h3>
              <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of users who trust SwiftPharma for their
                healthcare needs. Experience premium service today.
              </p>
              <Link to="/categories">
                <button className="px-10 py-4 text-lg font-semibold bg-white/90 text-brand-coral rounded-xl hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  Get Started Today →
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
