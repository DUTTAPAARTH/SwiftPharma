import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ProductCard from "../components/cards/ProductCard";
import {
  fetchProductsByCategory,
  fetchCategories,
} from "../services/productService";
import SubstituteModal from "../components/modals/SubstituteModal";
import { ensureAuthenticated } from "../utils/auth";
import { useHealthCompanion } from "../context/HealthCompanionContext";

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[400px] animate-pulse">
    <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-900" />
    <div className="p-6 space-y-4">
      <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/3" />
      <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded w-full" />
      <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-2/3" />
      <div className="mt-auto h-10 bg-slate-100 dark:bg-slate-700 rounded-full w-full" />
    </div>
  </div>
);

const filtersConfig = {
  types: ["Tablet", "Syrup", "Gel", "Spray"],
  salts: ["Paracetamol", "Ibuprofen", "Aceclofenac", "Diclofenac"],
  age: ["Adults", "Kids"],
};

const CategoryDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, items, replaceItem } = useCart();
  const { toggle, isSaved } = useWishlist();
  const { openWithMessage } = useHealthCompanion();

  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [substituteModal, setSubstituteModal] = useState({
    open: false,
    base: null,
    options: [],
  });
  const [error, setError] = useState(null);
  const [openFaq, setOpenFaq] = useState("");

  // Fetch category data and products
  useEffect(() => {
    const loadData = async () => {
      try {
        setCategoryLoading(true);
        setLoading(true);

        const [productsData, categoriesData] = await Promise.all([
          fetchProductsByCategory(slug),
          fetchCategories(),
        ]);

        setProducts(productsData || []);

        const matchedCategory = (categoriesData || []).find(
          (cat) => cat.slug === slug,
        );

        setCategory(
          matchedCategory ||
            (productsData?.length
              ? {
                  name: slug.replace(/-/g, " "),
                  slug,
                  productCount: productsData.length,
                  description: "Curated medicines in this category",
                }
              : null),
        );

        setError(null);
      } catch (err) {
        console.error("Error loading category data:", err);
        setError("Failed to load medicines for this category");
        setProducts([]);
      } finally {
        setCategoryLoading(false);
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  const maxPrice = useMemo(() => {
    if (!products.length) return 2000; // Increased default for real medicine prices
    return Math.max(...products.map((p) => p.price || 0)) + 100;
  }, [products]);

  const [filters, setFilters] = useState({
    types: [],
    salts: [],
    age: [],
    otcOnly: false,
    price: 2000,
    brandType: "All",
  });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, price: maxPrice }));
  }, [maxPrice]);

  const toggleArrayFilter = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      const next = exists
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value];
      return { ...prev, [key]: next };
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Price filter
      if (p.price > filters.price) {
        return false;
      }

      // Rx filter
      if (filters.otcOnly && p.requiresRx) {
        return false;
      }

      // Composition-based filters (if needed)
      if (filters.salts.length && p.composition) {
        const hasComposition = filters.salts.some((salt) =>
          p.composition.toLowerCase().includes(salt.toLowerCase()),
        );
        if (!hasComposition) {
          return false;
        }
      }

      return true;
    });
  }, [products, filters]);

  const normalizeCartProduct = (product) => ({
    id: product?._id || product?.id,
    productId: product?._id || product?.id,
    name: product?.name,
    price: product?.price || 0,
    mrp: product?.mrp || product?.price || 0,
    isRx: product?.requiresRx,
    requiresRx: product?.requiresRx,
    image: product?.images?.[0],
    composition: product?.composition || "",
    strength: product?.strength || "",
    manufacturer: product?.manufacturer || "",
  });

  const handleSubstitute = (product) => {
    if (!product) return;
    const saltKey = (product.composition || "")
      .split(/,|\+/)[0]
      ?.trim()
      .toLowerCase();

    const sameSalt = (products || []).filter((p) => {
      if (!p) return false;
      if (p._id === product._id || p.id === product._id) return false;
      if (!saltKey) return false;
      const matchesSalt = (p.composition || "").toLowerCase().includes(saltKey);
      const matchesStrength =
        product.strength && p.strength
          ? p.strength.toLowerCase() === product.strength.toLowerCase()
          : true;
      return matchesSalt && matchesStrength;
    });

    const cheaper = sameSalt.filter(
      (p) => Number(p.price || Infinity) < Number(product.price || Infinity),
    );

    const options = (cheaper.length ? cheaper : sameSalt).sort(
      (a, b) => Number(a.price || 0) - Number(b.price || 0),
    );

    setSubstituteModal({
      open: true,
      base: product,
      options,
    });
  };

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
        <Navbar />
        <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 space-y-12">
          <div className="h-64 bg-white dark:bg-slate-800 rounded-[56px] animate-pulse mb-12"></div>
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 h-[600px] bg-white dark:bg-slate-800 rounded-[40px] animate-pulse"></div>
            <div className="lg:col-span-3 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category || error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-black">Category not found</h1>
          <Link
            to="/categories"
            className="inline-block h-14 px-8 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center"
          >
            Back to categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 space-y-12">
        {/* Header Hero Section */}
        <section className="relative overflow-hidden rounded-[56px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 md:p-16 shadow-soft group">
          <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-[240px] font-black">
              {category.icon || "medical_services"}
            </span>
          </div>
          <div className="relative z-10 space-y-8 max-w-3xl font-nexus-bold">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
              Curated category
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              {category.name}
            </h1>
            <p className="text-xl text-slate-500 font-medium">
              {category.description ||
                "Trusted products with live stock and transparent pricing."}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-primary text-xl">
                  inventory_2
                </span>
                <span className="text-sm font-bold">
                  {filteredProducts.length} products
                </span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-green-500 text-xl">
                  verified
                </span>
                <span className="text-sm font-bold">Quality checked</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Action Strip */}
        <section className="bg-primary/5 rounded-[40px] p-8 border border-primary/10 flex flex-col lg:flex-row items-center justify-between gap-8 group hover:bg-primary/10 transition-all">
          <div className="flex items-center gap-6">
            <div className="size-16 rounded-[24px] bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined text-3xl animate-pulse">
                clinical_notes
              </span>
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Need help choosing?
              </h4>
              <p className="text-slate-500 text-sm">
                Ask the AI assistant for product guidance or upload a
                prescription for review.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                openWithMessage(
                  `Help me choose the right medicine from ${category?.name || "this category"}.`,
                )
              }
              className="h-14 px-10 rounded-full bg-white dark:bg-slate-800 border border-primary/20 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              Ask Health Companion
            </button>
            <Link to="/prescriptions">
              <button className="h-14 px-10 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                Upload prescription
              </button>
            </Link>
          </div>
        </section>

        <section className="grid lg:grid-cols-[320px_1fr] gap-12 items-start">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block sticky top-32 space-y-10">
            <div className="bg-white dark:bg-slate-800 rounded-[40px] p-10 border border-slate-100 dark:border-slate-700 shadow-soft space-y-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Filter products
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      types: [],
                      salts: [],
                      age: [],
                      price: maxPrice,
                    })
                  }
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-all"
                >
                  Reset
                </button>
              </div>

              {[
                {
                  title: "Product type",
                  key: "types",
                  options: filtersConfig.types,
                },
                {
                  title: "Composition",
                  key: "salts",
                  options: filtersConfig.salts,
                },
                { title: "Target Age", key: "age", options: filtersConfig.age },
              ].map((group) => (
                <div key={group.key} className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {group.title}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => toggleArrayFilter(group.key, opt)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          filters[group.key].includes(opt)
                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-primary/50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Budget Limit (₹)
                </h5>
                <input
                  type="range"
                  min={0}
                  max={maxPrice}
                  value={filters.price}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                  <span>₹0</span>
                  <span className="text-primary">Up to ₹{filters.price}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 dark:border-slate-700">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.otcOnly}
                      onChange={() =>
                        setFilters((p) => ({ ...p, otcOnly: !p.otcOnly }))
                      }
                      className="peer sr-only"
                    />
                    <div className="w-12 h-6 bg-slate-100 dark:bg-slate-700 rounded-full peer-checked:bg-primary transition-all"></div>
                    <div className="absolute top-1 left-1 size-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-primary transition-all">
                    OTC only
                  </span>
                </label>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Available products
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Showing {filteredProducts.length} products in this category.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  {["All", "Branded", "Generic"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFilters({ ...filters, brandType: opt })}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        filters.brandType === opt
                          ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                          : "text-slate-400"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full py-40 text-center space-y-8 bg-white dark:bg-slate-800 rounded-[56px] border border-slate-100 dark:border-slate-700 shadow-soft">
                  <span className="material-symbols-outlined text-[100px] text-slate-100 dark:text-slate-700">
                    pill_off
                  </span>
                  <p className="text-slate-400 font-bold text-xl">
                    No products match your filters.
                  </p>
                  <button
                    onClick={() =>
                      setFilters({
                        ...filters,
                        types: [],
                        salts: [],
                        age: [],
                        price: maxPrice,
                      })
                    }
                    className="h-14 px-10 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <ProductCard
                    key={p._id}
                    {...p}
                    id={p._id}
                    onSubstitute={handleSubstitute}
                    onAdd={(product) => {
                      if (!ensureAuthenticated(navigate)) return;
                      addItem(normalizeCartProduct(product), 1);
                    }}
                    onView={(product) => {
                      const id = product?._id || product?.id;
                      if (!id) return;
                      navigate(`/product/${id}`);
                    }}
                    onToggleSave={(product) => {
                      if (!ensureAuthenticated(navigate)) return;
                      toggle({
                        id: product._id || product.id,
                        name: product.name,
                        price: product.price,
                        image: product.images?.[0],
                        composition: product.composition,
                        manufacturer: product.manufacturer,
                      });
                    }}
                    isSaved={isSaved(p._id || p.id)}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-nexus-bold">Learn before you take</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                key: "paracetamol",
                title: "When to take paracetamol?",
                body: "Use for fever and mild to moderate pain. Keep 6-hour gaps between doses. Max 4g per day for adults.",
              },
              {
                key: "side-effects",
                title: "Side effects of painkillers",
                body: "Common: acidity, nausea. Rare: liver impact with overdose. Avoid alcohol while taking paracetamol or NSAIDs.",
              },
              {
                key: "avoid",
                title: "When NOT to self-medicate",
                body: "High fever >102°F, persistent chest pain, breathlessness, or if pregnant—consult a doctor.",
              },
              {
                key: "kids",
                title: "Fever medicines for children",
                body: "Use weight-based dosing, avoid aspirin in kids, and check dosing intervals strictly.",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-border bg-white shadow-soft"
              >
                <button
                  onClick={() =>
                    setOpenFaq((prev) => (prev === item.key ? "" : item.key))
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {openFaq === item.key ? "−" : "+"}
                  </span>
                </button>
                {openFaq === item.key && (
                  <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">
                    {item.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="md:hidden fixed inset-x-4 bottom-4 z-40">
        <Link
          to="/cart"
          className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-full bg-primary text-white font-semibold shadow-glow"
        >
          🛒 View cart
        </Link>
      </div>

      <Footer />

      {substituteModal.open && (
        <SubstituteModal
          baseProduct={substituteModal.base}
          options={substituteModal.options}
          loading={substituteLoading}
          onClose={() =>
            setSubstituteModal({ open: false, base: null, options: [] })
          }
          onAddToCart={handleAddSubstituteToCart}
          onReplaceInCart={handleReplaceWithSubstitute}
        />
      )}
    </div>
  );
};

export default CategoryDetail;
