import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { fetchProductById, fetchProducts } from "../services/productService";
import { fetchDrugInfo } from "../services/drugInfoService";
import { createSubscription } from "../services/subscriptionService";
import { useWishlist } from "../hooks/useWishlist";
import SubstituteModal from "../components/modals/SubstituteModal";
import { ensureAuthenticated } from "../utils/auth";
import ProductCard from "../components/cards/ProductCard";
import { AuthContext } from "../context/AuthContext";

const FALLBACK_IMAGE =
  "https://via.placeholder.com/200x200/0a0f1e/00bcd4?text=%F0%9F%92%8A";

const normalizeImage = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return value.startsWith("/") ? value : `/${value}`;
};

const reminderOptions = [
  { value: 1, label: "1 day before" },
  { value: 2, label: "2 days before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
];

const frequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Every 2 months" },
];

const freqLabel = frequencyOptions.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const calculateFirstRefillDate = (frequency) => {
  const date = new Date();
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "bimonthly":
      date.setMonth(date.getMonth() + 2);
      break;
    case "monthly":
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const buildSavedAddress = (user) => {
  if (!user) {
    return { street: "", city: "", state: "", pincode: "" };
  }

  if (user.address && typeof user.address === "object") {
    return {
      street: user.address.street || "",
      city: user.address.city || "",
      state: user.address.state || "",
      pincode: user.address.pincode || "",
    };
  }

  return { street: "", city: "", state: "", pincode: "" };
};

const MedicineFallback = ({ className = "h-full w-full" }) => (
  <div className={`flex items-center justify-center bg-[#1a1f2e] ${className}`}>
    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-400/20 bg-[#121827] shadow-[0_20px_60px_rgba(0,188,212,0.18)]">
      <svg
        viewBox="0 0 64 64"
        className="h-14 w-14"
        aria-hidden="true"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="12"
          y="20"
          width="40"
          height="24"
          rx="12"
          fill="#00BCD4"
          fillOpacity="0.18"
          stroke="#00BCD4"
          strokeWidth="3"
        />
        <path
          d="M24 40L40 24"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M20 28H28"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M36 36H44"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { addItem, items, replaceItem } = useCart();
  const { toggle, isSaved } = useWishlist();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [adding, setAdding] = useState(false);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [substituteOptions, setSubstituteOptions] = useState([]);
  const [substituteLoading, setSubstituteLoading] = useState(false);
  const [mainImageFailed, setMainImageFailed] = useState(false);
  const [fdaData, setFdaData] = useState(null);
  const [fdaLoading, setFdaLoading] = useState(false);
  const [fdaOpen, setFdaOpen] = useState(false);
  const [fdaFetched, setFdaFetched] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeToast, setSubscribeToast] = useState("");
  const [subscriptionForm, setSubscriptionForm] = useState({
    frequency: "monthly",
    quantity: 1,
    reminderDaysBefore: 2,
    useSavedAddress: true,
    deliveryAddress: buildSavedAddress(user),
  });

  const cartItem = useMemo(
    () => items.find((i) => i.id === id || i.productId === id),
    [items, id],
  );
  const productImage = normalizeImage(product?.image || product?.images?.[0]);
  const categoryLabel =
    typeof product?.category === "object"
      ? product?.category?.name
      : product?.category;

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const data = await fetchProductById(id);
        setProduct(data);
        const relatedCategory = data?.category?._id || data?.category;
        if (relatedCategory) {
          const related = await fetchProducts({
            category: relatedCategory,
            limit: 6,
          });
          setRelatedProducts(
            (related || []).filter((p) => p._id !== data?._id),
          );
        }
      } catch (err) {
        setError("Unable to load product details.");
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  useEffect(() => {
    const loadSubstitutes = async () => {
      if (!product?.composition) return;
      const salt = product.composition.split(/,|\+/)[0]?.trim();
      if (!salt) return;
      try {
        setSubstituteLoading(true);
        const results = await fetchProducts({ search: salt, limit: 10 });
        setSubstituteOptions(
          (results || []).filter((p) => p._id !== product._id),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSubstituteLoading(false);
      }
    };
    loadSubstitutes();
  }, [product]);

  useEffect(() => {
    setFdaData(null);
    setFdaLoading(false);
    setFdaOpen(false);
    setFdaFetched(false);
  }, [product?._id]);

  useEffect(() => {
    setSubscriptionForm({
      frequency: "monthly",
      quantity: 1,
      reminderDaysBefore: 2,
      useSavedAddress: true,
      deliveryAddress: buildSavedAddress(user),
    });
  }, [product?._id, user]);

  const handleFdaToggle = async () => {
    const nextOpen = !fdaOpen;
    setFdaOpen(nextOpen);

    if (!nextOpen || fdaFetched || fdaLoading) {
      return;
    }

    const medicineName = String(
      product?.genericName || product?.name || "",
    ).trim();

    if (!medicineName) {
      setFdaFetched(true);
      setFdaData({ notFound: true });
      return;
    }

    try {
      setFdaLoading(true);
      const data = await fetchDrugInfo(medicineName);
      if (data?.success) {
        setFdaData(data);
      } else {
        setFdaData({ notFound: true });
      }
    } catch (error) {
      setFdaData({ notFound: true });
    } finally {
      setFdaLoading(false);
      setFdaFetched(true);
    }
  };

  const normalize = (p) => ({
    id: p?._id || p?.id,
    productId: p?._id || p?.id,
    name: p?.name,
    price: p?.price || 0,
    mrp: p?.mrp || p?.price * 1.2,
    isRx: p?.requiresRx,
    image: p?.images?.[0],
    composition: p?.composition || "",
    strength: p?.strength || "",
    manufacturer: p?.manufacturer || "",
  });

  const handleAddToCart = () => {
    if (!product || !ensureAuthenticated(navigate)) return;
    setAdding(true);
    addItem(normalize(product), quantity);
    setTimeout(() => setAdding(false), 1000);
  };

  const handleStartSubscription = async () => {
    if (!product || !ensureAuthenticated(navigate)) return;

    setSubscribing(true);
    try {
      const payload = {
        productId: product._id,
        quantity: Math.max(1, Number(subscriptionForm.quantity || 1)),
        frequency: subscriptionForm.frequency,
        deliveryAddress: subscriptionForm.deliveryAddress,
        reminderDaysBefore: Number(subscriptionForm.reminderDaysBefore || 2),
      };

      const { data } = await createSubscription(payload);
      const firstRefill = data?.subscription?.nextRefillDate
        ? formatDate(data.subscription.nextRefillDate)
        : formatDate(calculateFirstRefillDate(subscriptionForm.frequency));

      setSubscribeOpen(false);
      setSubscribeToast(`Subscription started! First refill on ${firstRefill}`);
      setTimeout(() => setSubscribeToast(""), 4000);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        "Failed to start subscription. Please try again.";
      setSubscribeToast(msg);
      setTimeout(() => setSubscribeToast(""), 4500);
    } finally {
      setSubscribing(false);
    }
  };

  const firstRefillDate = useMemo(
    () => calculateFirstRefillDate(subscriptionForm.frequency),
    [subscriptionForm.frequency],
  );

  if (loading)
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Navbar />
        <div className="max-w-[1280px] mx-auto px-6 pt-40 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 animate-pulse">
            <div className="aspect-square rounded-[48px] bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-8">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/4" />
              <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-[20px] w-3/4" />
              <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[32px] w-full" />
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-12 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span className="material-symbols-outlined text-[12px]">
            chevron_right
          </span>
          <Link
            to="/categories"
            className="hover:text-primary transition-colors"
          >
            Categories
          </Link>
          <span className="material-symbols-outlined text-[12px]">
            chevron_right
          </span>
          <span className="text-slate-900 dark:text-white">
            {product?.name}
          </span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Visual Showcase */}
          <div className="space-y-8">
            <div className="relative aspect-square rounded-[56px] bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden group">
              {productImage && !mainImageFailed ? (
                <img
                  src={productImage}
                  alt={product?.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  onError={() => setMainImageFailed(true)}
                />
              ) : (
                <MedicineFallback className="h-full w-full" />
              )}

              {product?.requiresRx && (
                <div className="absolute top-8 left-8 p-3 px-6 bg-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center gap-2 text-white shadow-2xl">
                  <span className="material-symbols-outlined text-sm font-bold">
                    clinical_notes
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Prescription required
                  </span>
                </div>
              )}

              <button
                onClick={() => toggle(normalize(product))}
                className={`absolute top-8 right-8 size-14 rounded-2xl flex items-center justify-center transition-all ${
                  isSaved(product?._id)
                    ? "bg-red-500 text-white shadow-xl shadow-red-500/20"
                    : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-400 hover:text-red-500 shadow-lg"
                }`}
              >
                <span className="material-symbols-outlined font-bold">
                  {isSaved(product?._id) ? "favorite" : "favorite"}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => {
                const thumbSrc = productImage || FALLBACK_IMAGE;
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-2 group cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
                  >
                    <img
                      src={thumbSrc}
                      className="w-full h-full object-cover rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity"
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        if (event.currentTarget.nextSibling) {
                          event.currentTarget.nextSibling.style.display =
                            "flex";
                        }
                      }}
                    />
                    <MedicineFallback className="hidden h-full w-full rounded-2xl" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product Intel */}
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-5 py-2 rounded-2xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20">
                  {categoryLabel || "Verified Medicine"}
                </span>
                {product?.stock > 0 ? (
                  <span className="flex items-center gap-1.5 text-green-500 text-[10px] font-black uppercase">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>{" "}
                    In stock
                  </span>
                ) : (
                  <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">
                    Out of Stock
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1]">
                  {product?.name}
                </h1>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium text-lg italic">
                  <span>{product?.manufacturer || "Trusted manufacturer"}</span>
                  <div className="size-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <span>{product?.packSize || "10 Units / Pack"}</span>
                </div>
              </div>

              <div className="flex items-baseline gap-6 py-4">
                <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                  ₹{product?.price?.toLocaleString()}
                </p>
                {product?.mrp > product?.price && (
                  <div className="flex flex-col">
                    <span className="text-slate-400 line-through text-lg">
                      ₹{product?.mrp?.toLocaleString()}
                    </span>
                    <span className="text-green-500 text-xs font-black uppercase tracking-[0.1em]">
                      {Math.round(
                        ((product.mrp - product.price) / product.mrp) * 100,
                      )}
                      % off MRP
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Summary */}
            <div className="p-8 rounded-[40px] bg-slate-100 dark:bg-slate-900 shadow-inner border border-slate-200 dark:border-slate-800/50 space-y-6">
              <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined font-black text-primary">
                  biotech
                </span>
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Composition
                </h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {product?.composition ||
                  "Ingredient details will appear here when available."}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-800">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Strength
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {product?.strength || "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-800">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Pharmacology
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {product?.requiresRx ? "Schedule H" : "OTC Verified"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
              <button
                type="button"
                onClick={handleFdaToggle}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="text-left">
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    FDA Drug Information
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-500 mt-1">
                    Powered by FDA Database
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
                  {fdaOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {fdaOpen && (
                <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-800">
                  {fdaLoading ? (
                    <div className="space-y-3 pt-5 animate-pulse">
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-1/3" />
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-full" />
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-5/6" />
                    </div>
                  ) : fdaData && !fdaData.notFound ? (
                    <div className="pt-5 space-y-4 text-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black">
                            Generic Name
                          </p>
                          <p className="text-slate-900 dark:text-white font-semibold">
                            {fdaData.genericName || "Not available"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black">
                            Manufacturer
                          </p>
                          <p className="text-slate-900 dark:text-white font-semibold">
                            {fdaData.manufacturer || "Not available"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black mb-1">
                          Indications
                        </p>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                          {(fdaData.indications || ["Not available"])
                            .slice(0, 3)
                            .map((item, index) => (
                              <li key={`ind-${index}`}>{item}</li>
                            ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black mb-1">
                          Side Effects
                        </p>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                          {(fdaData.sideEffects || ["Not available"])
                            .slice(0, 3)
                            .map((item, index) => (
                              <li key={`side-${index}`}>{item}</li>
                            ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black mb-1">
                          Contraindications
                        </p>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                          {(fdaData.contraindications || ["Not available"])
                            .slice(0, 3)
                            .map((item, index) => (
                              <li key={`contra-${index}`}>{item}</li>
                            ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black mb-1">
                          Warnings
                        </p>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                          {(fdaData.warnings || ["Not available"])
                            .slice(0, 2)
                            .map((item, index) => (
                              <li key={`warn-${index}`}>{item}</li>
                            ))}
                        </ul>
                      </div>

                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Source: FDA + RxNorm database
                      </p>
                    </div>
                  ) : (
                    <div className="pt-5">
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        FDA data not available for this medicine
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-3">
                        Source: FDA + RxNorm database
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Interaction Area */}
            <div className="flex flex-col sm:flex-row items-stretch gap-4 pt-4">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-2 rounded-3xl border border-slate-200 dark:border-slate-800 sm:w-48">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="size-12 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:scale-105 transition-transform"
                >
                  −
                </button>
                <span className="flex-1 text-center text-xl font-black text-slate-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="size-12 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="flex-1 h-16 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all active:scale-[0.98] relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {adding
                    ? "Adding..."
                    : cartItem
                      ? `Update bag (${cartItem.quantity})`
                      : "Add to cart"}
                </span>
                <div className="absolute inset-0 bg-primary translate-y-16 group-hover:translate-y-0 transition-transform duration-500"></div>
              </button>
            </div>

            <button
              onClick={() => {
                if (!ensureAuthenticated(navigate)) return;
                setSubscribeOpen(true);
              }}
              className="w-full h-16 rounded-[28px] border-2 border-cyan-400/50 text-cyan-300 font-black text-[10px] uppercase tracking-[0.18em] hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-lg">
                autorenew
              </span>
              Subscribe & Save - Auto-refill monthly
            </button>

            <button
              onClick={() => setSubstituteOpen(true)}
              className="w-full h-14 rounded-3xl border-2 border-slate-200 dark:border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-lg">cyclone</span>
              Find substitutes
            </button>
          </div>
        </div>

        {/* Product Tabs */}
        <section className="mt-32 space-y-12 animate-in slide-in-from-bottom duration-1000">
          <div className="flex items-center gap-8 border-b border-slate-100 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {["overview", "usage", "side-effects", "faqs"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-6 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                  activeTab === tab
                    ? "text-primary"
                    : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.replace("-", " ")}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-[48px] p-10 lg:p-16 border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute -bottom-20 -right-20 size-80 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-colors duration-1000"></div>

            <div className="relative z-10 max-w-4xl space-y-8 line-height-relaxed">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter capitalize underline decoration-primary/30 underline-offset-8 decoration-4">
                    About {product?.name}
                  </h3>
                  <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">
                    Usage, storage, and safety details for this medicine.
                  </p>
                  <div className="grid md:grid-cols-2 gap-8 pt-6">
                    <div className="p-8 rounded-[40px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                      <span className="material-symbols-outlined text-primary mb-6 text-4xl">
                        thermostat
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-widest mb-3">
                        Storage Guidelines
                      </h4>
                      <p className="text-sm font-medium text-slate-500">
                        Maintain cool, dry environment (below 25°C). Avoid light
                        exposure and moisture penetration.
                      </p>
                    </div>
                    <div className="p-8 rounded-[40px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                      <span className="material-symbols-outlined text-primary mb-6 text-4xl">
                        inventory_2
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-widest mb-3">
                        Authenticity Check
                      </h4>
                      <p className="text-sm font-medium text-slate-500">
                        Scan QR on pack for blockchain verification. Distributed
                        by SwiftPharma Licensed Partner.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Other tabs follow similar premium patterns... */}
              {activeTab !== "overview" && (
                <div className="space-y-6">
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter capitalize underline decoration-primary/30 underline-offset-8 decoration-4">
                    {activeTab.replace("-", " ")}
                  </h3>
                  <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">
                    Helpful information for safe and informed use.
                  </p>
                  <div className="p-12 rounded-[48px] bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50">
                    <p className="text-amber-800 dark:text-amber-400 font-bold">
                      Please consult your doctor or pharmacist for advice
                      specific to your condition before using this medicine.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-40 space-y-12">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  You may also like
                </p>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                  Related products
                </h2>
              </div>
              <Link
                to="/categories"
                className="text-xs font-black text-primary hover:gap-4 transition-all flex items-center gap-2"
              >
                EXPLORE ALL{" "}
                <span className="material-symbols-outlined text-sm font-bold">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {relatedProducts.slice(0, 5).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />

      {subscribeToast && (
        <div className="fixed top-5 right-5 z-[140] rounded-xl border border-cyan-400/35 bg-[#0a0f1e] px-4 py-3 text-sm text-cyan-200 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          {subscribeToast}
        </div>
      )}

      {subscribeOpen && (
        <div
          className="fixed inset-0 z-[130] bg-[#05080f]/90 backdrop-blur-sm px-4 py-6 overflow-y-auto"
          onClick={() => setSubscribeOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-w-3xl mx-auto rounded-3xl border border-cyan-400/30 bg-[#0a0f1e] p-6 md:p-8 space-y-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Subscribe to {product?.name}
                </h2>
                <p className="text-slate-400 mt-1">
                  Never run out - we will refill automatically
                </p>
              </div>
              <button
                onClick={() => setSubscribeOpen(false)}
                className="size-10 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <section className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
                Frequency
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {frequencyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        frequency: option.value,
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                      subscriptionForm.frequency === option.value
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                        : "border-slate-700 text-slate-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
                Quantity per refill
              </p>
              <div className="flex items-center gap-2 w-fit rounded-2xl border border-slate-700 bg-[#12192b] p-1.5">
                <button
                  onClick={() =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      quantity: Math.max(1, Number(prev.quantity || 1) - 1),
                    }))
                  }
                  className="size-10 rounded-xl bg-[#0a0f1e] text-white"
                >
                  -
                </button>
                <span className="w-10 text-center text-white font-black">
                  {subscriptionForm.quantity}
                </span>
                <button
                  onClick={() =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      quantity: Number(prev.quantity || 1) + 1,
                    }))
                  }
                  className="size-10 rounded-xl bg-cyan-500 text-[#0a0f1e] font-black"
                >
                  +
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-[#12192b] p-4">
              <p className="text-sm text-slate-200 font-semibold">
                First refill: {formatDate(firstRefillDate)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Then every{" "}
                {freqLabel[subscriptionForm.frequency]?.toLowerCase() ||
                  "monthly"}{" "}
                after that
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
                  Delivery address
                </p>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={subscriptionForm.useSavedAddress}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        useSavedAddress: checked,
                        deliveryAddress: checked
                          ? buildSavedAddress(user)
                          : prev.deliveryAddress,
                      }));
                    }}
                  />
                  Use my saved address
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { key: "street", label: "Street" },
                  { key: "city", label: "City" },
                  { key: "state", label: "State" },
                  { key: "pincode", label: "Pincode" },
                ].map((field) => (
                  <label key={field.key} className="space-y-1">
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                      {field.label}
                    </span>
                    <input
                      value={subscriptionForm.deliveryAddress[field.key]}
                      onChange={(event) =>
                        setSubscriptionForm((prev) => ({
                          ...prev,
                          useSavedAddress: false,
                          deliveryAddress: {
                            ...prev.deliveryAddress,
                            [field.key]: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-[#12192b] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-black">
                Remind me before refill
              </p>
              <select
                value={subscriptionForm.reminderDaysBefore}
                onChange={(event) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    reminderDaysBefore: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-700 bg-[#12192b] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              >
                {reminderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </section>

            <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-cyan-200 font-black">
                Subscription Summary
              </p>
              <p className="text-sm text-white">
                Medicine name: {product?.name}
              </p>
              <p className="text-sm text-slate-200">
                Quantity per refill: {subscriptionForm.quantity}
              </p>
              <p className="text-sm text-slate-200">
                Price per refill: ₹
                {Number(
                  (product?.price || 0) * subscriptionForm.quantity,
                ).toLocaleString()}
              </p>
              <p className="text-sm text-slate-200">
                Frequency: {freqLabel[subscriptionForm.frequency] || "Monthly"}
              </p>
              <p className="text-sm text-slate-200">
                Next refill: {formatDate(firstRefillDate)}
              </p>
              <p className="text-sm text-cyan-100">
                You save time and never miss a dose
              </p>
            </section>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleStartSubscription}
                disabled={subscribing}
                className="flex-1 min-w-[180px] rounded-xl bg-cyan-400 text-[#0a0f1e] font-black py-3 hover:bg-cyan-300 disabled:opacity-50"
              >
                {subscribing ? "Starting..." : "Start Subscription"}
              </button>
              <button
                onClick={() => setSubscribeOpen(false)}
                className="flex-1 min-w-[180px] rounded-xl border border-slate-700 bg-[#12192b] text-slate-200 font-bold py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {substituteOpen && (
        <SubstituteModal
          baseProduct={product}
          options={substituteOptions}
          loading={substituteLoading}
          onClose={() => setSubstituteOpen(false)}
          onAddToCart={(opt) => {
            addItem(normalize(opt), 1);
            setSubstituteOpen(false);
          }}
          onReplaceInCart={(opt) => {
            replaceItem(product._id, normalize(opt), cartItem?.quantity || 1);
            setSubstituteOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ProductDetail;
