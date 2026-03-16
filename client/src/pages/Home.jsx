import { useEffect, useState } from "react";
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
    Antibiotics: "pill",
    "Pain Relief": "healing",
    "Cough & Cold": "thermometer",
    "Digestive Health": "gastroscopy",
    "Allergy Relief": "vaccines",
    "Mental Health": "psychology",
    "Heart Health": "cardiology",
    Wellness: "fitness_center",
    Infections: "microbiology",
    Respiratory: "airvent",
    "General Medicine": "medical_services",
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts({ limit: 12 }),
          fetchCategories(),
        ]);
        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setError(null);
      } catch (err) {
        setError("Unable to load products right now.");
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
          icon: categoryIcons[cat.name] || "pill",
          name: cat.name,
          slug: cat.slug,
          caption: cat.description || "Trusted health essentials",
          count: cat.productCount || 0,
        }))
      : [
          { icon: "pill", name: "Antibiotics", slug: "antibiotics", count: 24 },
          {
            icon: "healing",
            name: "Pain Relief",
            slug: "pain-relief",
            count: 42,
          },
          { icon: "vaccines", name: "Vitamins", slug: "vitamins", count: 18 },
          {
            icon: "gastroscopy",
            name: "Digestive",
            slug: "digestive",
            count: 31,
          },
          {
            icon: "dermatology",
            name: "Skin Care",
            slug: "skin-care",
            count: 27,
          },
          {
            icon: "thermometer",
            name: "Cold & Cough",
            slug: "cold-cough",
            count: 15,
          },
        ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="pb-32">
        <Hero categories={displayCategories} />

        {/* Trust Strip */}
        <div className="bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 py-10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-12">
              {[
                {
                  icon: "verified",
                  label: "Licensed pharmacies",
                  sub: "Pharmacist Verified",
                },
                {
                  icon: "medical_information",
                  label: "Quality checked",
                  sub: "Schedule H/H1 Compliant",
                },
                {
                  icon: "shield_check",
                  label: "Data Protection",
                  sub: "Indian IT Act Compliant",
                },
                {
                  icon: "support_agent",
                  label: "Support 24/7",
                  sub: "Clinical Assistance",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-5 group/item cursor-default"
                >
                  <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary border border-slate-100 dark:border-slate-700 transition-all group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white">
                    <span className="material-symbols-outlined text-2xl font-black">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {item.label}
                    </p>
                    <p className="font-black text-slate-900 dark:text-white tracking-tight">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-32 mt-24">
          {/* How It Works */}
          <section className="relative">
            <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-20">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
                  Simple 3-Step Process
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  How It Works
                </h2>
                <p className="text-xl text-slate-500 font-medium leading-relaxed">
                  From prescription to your door — easy, reliable, and always on
                  time.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  icon: "prescriptions",
                  title: "Upload Prescription",
                  desc: "Easily upload your prescription or search for medicines — fast, secure, and simple.",
                  color: "bg-blue-500",
                },
                {
                  icon: "inventory",
                  title: "Pharmacist Review",
                  desc: "Our licensed pharmacists carefully verify every order and pack it with precision.",
                  color: "bg-purple-500",
                },
                {
                  icon: "rocket_launch",
                  title: "Fast Delivery",
                  desc: "Your medicines arrive at your doorstep within 2 hours, every time, guaranteed.",
                  color: "bg-green-500",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="group bg-white dark:bg-slate-900 p-12 rounded-[56px] border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-2xl hover:-translate-y-4 transition-all duration-500 relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 right-0 size-48 ${step.color} opacity-5 -mr-16 -mt-16 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`}
                  ></div>
                  <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                    <span className="material-symbols-outlined text-5xl font-black">
                      {step.icon}
                    </span>
                  </div>
                  <div className="mt-10 space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Step 0{i + 1}
                      </p>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-lg">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Categories */}
          <section>
            <div className="flex items-center justify-between mb-16 px-4">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Browse Categories
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Shop by health category
                </p>
              </div>
              <Link
                to="/categories"
                className="h-14 px-8 rounded-full border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-3"
              >
                View All
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8">
              {displayCategories.map((category) => (
                <Link
                  key={category.name}
                  to={`/categories/${category.slug || category.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group relative h-72 rounded-[48px] overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:border-primary/30 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent z-10 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 transition-all duration-700 group-hover:scale-110">
                    <div className="size-20 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-4xl font-black">
                        {category.icon}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 p-8 z-20 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <p className="text-white font-black text-xl leading-tight uppercase tracking-tight">
                      {category.name}
                    </p>
                    <p className="text-white/60 text-[10px] font-black uppercase mt-1 tracking-widest">
                      {category.count || 0} Products
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Featured Products */}
          <section className="pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 px-4">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Featured Products
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Top picks for your health & wellness
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Most Popular
                </span>
                <div className="h-px w-24 bg-slate-100 dark:bg-slate-800"></div>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-[450px] rounded-[48px] bg-slate-100 dark:bg-slate-800 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : error ? (
              <div className="p-10 rounded-[48px] bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 flex items-center gap-6 text-xl font-black justify-center">
                <span className="material-symbols-outlined text-4xl">
                  report
                </span>{" "}
                {error}
              </div>
            ) : products.length > 0 ? (
              <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="py-32 text-center text-slate-400 font-black text-xl bg-slate-50 dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800">
                No products found. Check back soon!
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Emergency Helpline FAB */}
      <div className="fixed bottom-8 right-8 z-[100] group">
        <button className="h-16 pl-5 pr-6 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-3 hover:bg-red-700 transition-all duration-200 hover:shadow-xl hover:shadow-red-600/40 active:scale-95">
          <div className="relative flex-shrink-0">
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_hospital
            </span>
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-white animate-ping opacity-75"></span>
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-white"></span>
          </div>
          <div className="text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-red-200 leading-none mb-0.5">
              24/7 Helpline
            </p>
            <p className="font-black text-sm leading-none">Emergency</p>
          </div>
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default Home;
