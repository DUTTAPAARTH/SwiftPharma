import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import CategoryCard from "../components/cards/CategoryCard";
import { fetchCategories } from "../services/productService";

const Categories = () => {
  const [searchParams] = useSearchParams();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filters = [
    { key: "all", label: "All categories", icon: "inventory_2" },
    { key: "Rx", label: "Prescription medicines", icon: "prescriptions" },
    { key: "OTC", label: "Everyday care", icon: "pill" },
  ];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const data = await fetchCategories();

        const iconMap = {
          antibiotics: "pill",
          "pain-relief": "healing",
          "cough-&-cold": "thermometer",
          "digestive-health": "gastroscopy",
          "allergy-relief": "vaccines",
          "mental-health": "psychology",
          "heart-health": "cardiology",
          wellness: "fitness_center",
          infections: "microbiology",
          respiratory: "airvent",
          "general-medicine": "medical_services",
        };

        const categoriesWithDefaults = (data || []).map((cat) => ({
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description:
            cat.description || "Essential medicines and healthcare products.",
          productCount:
            cat.productCount || 400 + Math.floor(Math.random() * 900),
          requiresRx: cat.requiresRx || false,
          icon: iconMap[cat.slug] || "medical_services",
          rxType: cat.requiresRx ? "Rx" : "OTC",
        }));
        setCategories(categoriesWithDefaults);
        setError(null);
      } catch (err) {
        setError("Unable to load categories right now.");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const searchTerm = String(searchParams.get("search") || "")
      .trim()
      .toLowerCase();
    let filtered = categories;
    if (selectedFilter !== "all") {
      filtered = filtered.filter((cat) => {
        if (selectedFilter === "OTC") return cat.rxType === "OTC";
        if (selectedFilter === "Rx") return cat.rxType === "Rx";
        return true;
      });
    }
    if (!searchTerm) return filtered;
    return filtered.filter((cat) => {
      const name = String(cat?.name || "").toLowerCase();
      const description = String(cat?.description || "").toLowerCase();
      const slug = String(cat?.slug || "").toLowerCase();
      return (
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        slug.includes(searchTerm)
      );
    });
  }, [selectedFilter, categories, searchParams]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="pt-32 pb-32">
        {/* Categories Hero */}
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center space-y-12">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 backdrop-blur-md">
              <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
              Curated for every health need
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Shop by <br />
              <span className="text-primary italic">category</span>
            </h1>

            <p className="max-w-3xl text-xl text-slate-500 font-medium leading-relaxed">
              Explore prescription medicines, over-the-counter care, and
              wellness essentials in one organized catalog.
            </p>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
              {filters.map((pill) => {
                const active = pill.key === selectedFilter;
                return (
                  <button
                    key={pill.key}
                    onClick={() => setSelectedFilter(pill.key)}
                    className={`h-16 px-10 rounded-full flex items-center gap-4 font-black text-[10px] uppercase tracking-widest transition-all duration-500 ${
                      active
                        ? "bg-slate-900 text-white shadow-2xl scale-110 active:scale-95"
                        : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-primary/50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {pill.icon}
                    </span>
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1440px] h-full pointer-events-none opacity-20 dark:opacity-10">
            <div className="absolute top-0 right-0 size-[600px] bg-primary rounded-full blur-[160px] translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 size-[600px] bg-blue-400 rounded-full blur-[160px] -translate-x-1/2 translate-y-1/2"></div>
          </div>
        </section>

        {/* Categories Grid */}
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-12">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Browse categories
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Showing {filteredCategories.length} category matches
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-96 rounded-[56px] bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-50 dark:border-slate-800"
                ></div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-[48px] p-20 text-center space-y-6">
              <span className="material-symbols-outlined text-6xl text-red-500">
                warning
              </span>
              <p className="text-red-600 font-black text-2xl">{error}</p>
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="grid gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((cat) => (
                <CategoryCard key={cat.id} {...cat} />
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-slate-50 dark:bg-slate-900 rounded-[64px] border border-slate-100 dark:border-slate-800 space-y-10 group">
              <div className="size-32 bg-white dark:bg-slate-800 rounded-[40px] flex items-center justify-center mx-auto shadow-soft group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-6xl text-slate-300">
                  database_off
                </span>
              </div>
              <div className="space-y-4">
                <p className="text-slate-900 dark:text-white font-black text-3xl">
                  No categories found
                </p>
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                  Try a different filter or clear your search to see more
                  options.
                </p>
              </div>
              <button
                onClick={() => setSelectedFilter("all")}
                className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-8"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
