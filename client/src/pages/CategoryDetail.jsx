import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  fetchProductsByCategory,
  fetchCategories,
} from "../services/productService";
import SubstituteModal from "../components/modals/SubstituteModal";
import { ensureAuthenticated } from "../utils/auth";

const ProductCard = ({
  product,
  onAdd,
  onView,
  onSubstitute,
  onToggleSave,
  isSaved,
  isAdding,
}) => {
  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  const imageUrl =
    product.images?.[0] ||
    `https://via.placeholder.com/400x400/f7f6f4/666666?text=${encodeURIComponent(
      product.name.substring(0, 20),
    )}`;

  return (
    <div className="group h-full rounded-2xl border border-border bg-white shadow-soft hover:shadow-card transition-all duration-300 flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-[#f7f6f4]">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/400x400/f7f6f4/666666?text=${encodeURIComponent(
              product.name.substring(0, 20),
            )}`;
          }}
        />
        {product.requiresRx && (
          <span className="absolute left-2 top-2 rounded-full bg-[#0f172a] text-white text-xs px-3 py-1">
            Rx Required
          </span>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-2">
        <div className="min-h-[48px]">
          <p className="text-sm text-secondary-text uppercase tracking-wide">
            {product.manufacturer || "Unknown"}
          </p>
          <h3 className="text-lg font-nexus-bold text-primary-text leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>
        <p className="text-sm text-secondary-text">
          {product.composition || "See details"}
        </p>

        <div className="flex items-center gap-3 pt-1">
          <span className="text-xl font-nexus-bold text-primary-text">
            ₹{product.price?.toFixed(2) || "0"}
          </span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-sm text-secondary-text line-through">
              ₹{product.mrp?.toFixed(2)}
            </span>
          )}
          {discount ? (
            <span className="text-xs bg-[#ecfdf3] text-[#15803d] px-2 py-1 rounded-full border border-[#bbf7d0]">
              {discount}% off
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-secondary-text">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#f0f9f4] border border-[#c0ecd0]">
              {product.stock > 0 ? "In Stock" : "Out of Stock"}
            </span>
          </div>
          <button
            className="px-3 py-2 rounded-full bg-brand-coral text-white text-sm font-semibold shadow-soft hover:shadow-card transition"
            onClick={() => onAdd(product)}
            disabled={isAdding}
          >
            {isAdding ? "Added" : "Add to cart"}
          </button>
        </div>

        <div className="hidden md:flex items-center justify-between text-xs text-secondary-text pt-2 border-t border-border">
          <button
            className="hover:text-brand-coral flex items-center gap-1"
            onClick={() => onView(product)}
          >
            🔍 View details
          </button>
          <button
            className="hover:text-brand-coral flex items-center gap-1"
            onClick={() => onSubstitute(product)}
          >
            🔁 Substitute
          </button>
          <button
            className="hover:text-brand-coral flex items-center gap-1"
            onClick={() => onToggleSave(product)}
          >
            {isSaved ? "💖 Saved" : "❤️ Save"}
          </button>
        </div>
        <div className="md:hidden flex items-center justify-between text-xs text-secondary-text pt-2 border-t border-border">
          <button className="flex-1 py-2" onClick={() => onView(product)}>
            View
          </button>
          <button className="flex-1 py-2" onClick={() => onSubstitute(product)}>
            Substitute
          </button>
          <button className="flex-1 py-2" onClick={() => onToggleSave(product)}>
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="h-full rounded-2xl border border-border bg-white shadow-soft animate-pulse flex flex-col">
    <div className="aspect-square bg-[#f0f0f0] rounded-t-2xl" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-[#f0f0f0] rounded w-2/3" />
      <div className="h-4 bg-[#f0f0f0] rounded w-full" />
      <div className="h-3 bg-[#f0f0f0] rounded w-1/2" />
      <div className="h-8 bg-[#f0f0f0] rounded w-full" />
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

  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [substituteModal, setSubstituteModal] = useState({
    open: false,
    base: null,
    options: [],
  });
  const [substituteLoading, setSubstituteLoading] = useState(false);
  const [error, setError] = useState(null);

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
    showMobileFilters: false,
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
    const result = products.filter((p) => {
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
    return result;
  }, [products, filters]);

  const [openFaq, setOpenFaq] = useState("paracetamol");

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

  const handleAdd = (product) => {
    const productId = product?._id || product?.id;
    if (!productId) return;
    if (!ensureAuthenticated(navigate)) return;
    setAddingId(productId);
    addItem(normalizeCartProduct(product), 1);
    setTimeout(() => setAddingId(null), 800);
  };

  const handleView = (product) => {
    const id = product?._id || product?.id;
    if (!id) return;
    navigate(`/product/${id}`);
  };

  const handleSubstitute = (product) => {
    if (!product) return;
    const saltKey = (product.composition || "")
      .split(/,|\+/)[0]
      ?.trim()
      .toLowerCase();

    setSubstituteLoading(true);

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

    setSubstituteLoading(false);
  };

  const handleToggleSave = (product) => {
    if (!product) return;
    if (!ensureAuthenticated(navigate)) return;
    toggle({
      id: product._id || product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      composition: product.composition,
      manufacturer: product.manufacturer,
    });
  };

  const handleAddSubstituteToCart = (option) => {
    if (!ensureAuthenticated(navigate)) return;
    addItem(normalizeCartProduct(option), 1);
    setSubstituteModal({ open: false, base: null, options: [] });
  };

  const handleReplaceWithSubstitute = (option) => {
    if (!ensureAuthenticated(navigate)) return;
    const baseId = substituteModal.base?._id || substituteModal.base?.id;
    const existing = items.find(
      (p) => p.productId === baseId || p.id === baseId,
    );
    const qty = existing?.quantity || 1;

    replaceItem(baseId, normalizeCartProduct(option), qty);
    setSubstituteModal({ open: false, base: null, options: [] });
  };

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background text-primary-text flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-300 rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, idx) => (
                <div key={idx} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background text-primary-text flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <h1 className="text-3xl font-nexus-bold">Category not found</h1>
          <p className="text-secondary-text">
            Please go back and choose another category.
          </p>
          <div className="flex justify-center gap-4">
            <button
              className="px-5 py-2 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-lg transition"
              onClick={() => navigate(-1)}
            >
              Go back
            </button>
            <Link
              to="/categories"
              className="px-5 py-2 rounded-full border border-border text-primary-text font-semibold bg-white hover:-translate-y-0.5 hover:shadow-card transition"
            >
              All categories
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-primary-text flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <h1 className="text-3xl font-nexus-bold">Error Loading Medicines</h1>
          <p className="text-secondary-text">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              className="px-5 py-2 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-lg transition"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <Link
              to="/categories"
              className="px-5 py-2 rounded-full border border-border text-primary-text font-semibold bg-white hover:-translate-y-0.5 hover:shadow-card transition"
            >
              Back to categories
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#f7fbff] via-[#fff7f3] to-[#f2f6ff] p-8 md:p-12 shadow-[0_14px_48px_rgba(0,0,0,0.06)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#ffe8e2] blur-3xl opacity-60" />
          <div className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-[#e8f1ff] blur-3xl opacity-60" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border text-primary-text font-semibold shadow-soft text-sm">
                {category.icon || "💊"} {category.name}
              </span>
              <h1 className="text-3xl md:text-4xl font-nexus-bold text-primary-text leading-tight">
                {category.name}
              </h1>
              <p className="text-base md:text-lg text-secondary-text">
                {category.description ||
                  "Curated medicines with live availability and pricing."}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-secondary-text">
                <span className="px-3 py-1 rounded-full bg-white border border-border">
                  {category.productCount}+ items
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-border">
                  {category.deliveryEta || "Fast delivery"}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-border">
                  OTC-first
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-primary-text">
              {[
                "🌡️ Thermometer",
                "💊 Pain relief",
                "💧 Hydration",
                "🛌 Rest & care",
              ].map((item) => (
                <div
                  key={item}
                  className="px-4 py-3 rounded-2xl bg-white border border-border shadow-soft text-center"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white shadow-soft p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 text-primary-text">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-nexus-bold">Not sure what to take?</p>
              <p className="text-secondary-text text-sm">
                Upload your prescription or symptoms — AI will suggest
                medicines.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/ai-prescription"
              className="px-4 py-2 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition"
            >
              Use AI Assistant
            </Link>
            <Link
              to="/prescriptions"
              className="px-4 py-2 rounded-full border border-border bg-white text-primary-text font-semibold hover:-translate-y-0.5 hover:shadow-card transition"
            >
              Upload prescription
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-[280px_1fr] gap-6 items-start">
          <div className="hidden md:block sticky top-4">
            <div className="rounded-2xl border border-border bg-white shadow-soft p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-nexus-bold">Smart filters</p>
                <button
                  className="text-xs text-brand-coral"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      types: [],
                      salts: [],
                      age: [],
                      otcOnly: false,
                      price: maxPrice,
                      brandType: "All",
                    })
                  }
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Medicine Type</p>
                {filtersConfig.types.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 text-sm text-secondary-text"
                  >
                    <input
                      type="checkbox"
                      checked={filters.types.includes(t)}
                      onChange={() => toggleArrayFilter("types", t)}
                    />
                    {t}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Salt / Composition</p>
                {filtersConfig.salts.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 text-sm text-secondary-text"
                  >
                    <input
                      type="checkbox"
                      checked={filters.salts.includes(s)}
                      onChange={() => toggleArrayFilter("salts", s)}
                    />
                    {s}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Age Group</p>
                {filtersConfig.age.map((a) => (
                  <label
                    key={a}
                    className="flex items-center gap-2 text-sm text-secondary-text"
                  >
                    <input
                      type="checkbox"
                      checked={filters.age.includes(a)}
                      onChange={() => toggleArrayFilter("age", a)}
                    />
                    {a}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Prescription required</p>
                <label className="flex items-center gap-2 text-sm text-secondary-text">
                  <input
                    type="checkbox"
                    checked={filters.otcOnly}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        otcOnly: !prev.otcOnly,
                      }))
                    }
                  />
                  OTC only (default)
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Brand / Generic</p>
                <div className="flex gap-2 text-sm">
                  {["Branded", "Generic", "All"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, brandType: opt }))
                      }
                      className={`flex-1 px-3 py-2 rounded-full border text-center ${
                        filters.brandType === opt
                          ? "bg-brand-coral text-white border-brand-coral"
                          : "bg-white text-primary-text border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Price range (₹)</p>
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
                  className="w-full"
                />
                <div className="text-xs text-secondary-text">
                  Up to ₹{filters.price}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="md:hidden flex items-center justify-between bg-white border border-border rounded-2xl p-4 shadow-soft">
              <div>
                <p className="font-nexus-bold">Smart filters</p>
                <p className="text-xs text-secondary-text">OTC on by default</p>
              </div>
              <button
                className="px-4 py-2 rounded-full bg-brand-coral text-white text-sm font-semibold"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    showMobileFilters: !prev.showMobileFilters,
                  }))
                }
              >
                {filters.showMobileFilters ? "Close" : "Filters"}
              </button>
            </div>

            {filters.showMobileFilters && (
              <div className="md:hidden rounded-2xl border border-border bg-white shadow-soft p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-nexus-bold">Smart filters</p>
                  <button
                    className="text-xs text-brand-coral"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        types: [],
                        salts: [],
                        age: [],
                        otcOnly: false,
                        price: maxPrice,
                        brandType: "All",
                        showMobileFilters: false,
                      })
                    }
                  >
                    Reset
                  </button>
                </div>
                {/* Reuse same controls */}
                {[
                  filtersConfig.types,
                  filtersConfig.salts,
                  filtersConfig.age,
                ].map((group, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap gap-2 text-sm text-secondary-text"
                  >
                    {group.map((opt) => (
                      <button
                        key={opt}
                        onClick={() =>
                          toggleArrayFilter(
                            idx === 0 ? "types" : idx === 1 ? "salts" : "age",
                            opt,
                          )
                        }
                        className={`px-3 py-2 rounded-full border ${
                          (idx === 0 && filters.types.includes(opt)) ||
                          (idx === 1 && filters.salts.includes(opt)) ||
                          (idx === 2 && filters.age.includes(opt))
                            ? "bg-brand-coral text-white border-brand-coral"
                            : "bg-white text-primary-text border-border"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ))}

                <label className="flex items-center gap-2 text-sm text-secondary-text">
                  <input
                    type="checkbox"
                    checked={filters.otcOnly}
                    onChange={() =>
                      setFilters((prev) => ({
                        ...prev,
                        otcOnly: !prev.otcOnly,
                      }))
                    }
                  />
                  OTC only (default)
                </label>

                <div className="flex gap-2 text-sm">
                  {["Branded", "Generic", "All"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, brandType: opt }))
                      }
                      className={`flex-1 px-3 py-2 rounded-full border ${
                        filters.brandType === opt
                          ? "bg-brand-coral text-white border-brand-coral"
                          : "bg-white text-primary-text border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Price range (₹)</p>
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
                    className="w-full"
                  />
                  <div className="text-xs text-secondary-text">
                    Up to ₹{filters.price}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-nexus-bold">Products</h2>
                <p className="text-sm text-secondary-text">
                  High-contrast cards with consistent height.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-secondary-text">
                <span className="px-3 py-1 rounded-full bg-[#f7f6f4] border border-border">
                  Skeleton loaders
                </span>
                <span className="px-3 py-1 rounded-full bg-[#f7f6f4] border border-border">
                  Lazy images
                </span>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonCard key={idx} />
                ))}
              </div>
            ) : filteredProducts.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAdd={handleAdd}
                    onView={handleView}
                    onSubstitute={handleSubstitute}
                    onToggleSave={handleToggleSave}
                    isSaved={isSaved(product._id || product.id)}
                    isAdding={addingId === (product._id || product.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-white shadow-soft p-10 text-center space-y-3">
                <div className="text-4xl">🤕</div>
                <p className="text-lg font-nexus-bold">No medicines found</p>
                <p className="text-secondary-text">
                  Try removing filters or lowering the price range.
                </p>
                <button
                  className="px-4 py-2 rounded-full bg-brand-coral text-white text-sm font-semibold"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      types: [],
                      salts: [],
                      age: [],
                      otcOnly: false,
                      price: maxPrice,
                      brandType: "All",
                    })
                  }
                >
                  Clear filters
                </button>
              </div>
            )}
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
                  <span className="font-semibold text-primary-text">
                    {item.title}
                  </span>
                  <span className="text-secondary-text">
                    {openFaq === item.key ? "−" : "+"}
                  </span>
                </button>
                {openFaq === item.key && (
                  <div className="px-4 pb-4 text-sm text-secondary-text">
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
          className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-[0_10px_30px_rgba(227,93,57,0.35)]"
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
