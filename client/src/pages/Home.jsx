import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/Hero";
import ProductCard from "../components/cards/ProductCard";
import { fetchProducts, fetchCategories } from "../services/productService";
import { AuthContext } from "../context/AuthContext";
import { getReadiness as getVaultReadiness } from "../services/vaultService";
import { getTodayReminders } from "../services/reminderService";
import { getPendingAlerts } from "../services/caregiverService";
import LiveTrackingCard from "../components/LiveTrackingCard";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { useHealthCompanion } from "../context/HealthCompanionContext";

const normalizeStatus = (value) =>
  String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const formatTimeLabel = (value) => {
  if (!value) return "";
  const [hours, minutes] = String(value).split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const Home = () => {
  const navigate = useNavigate();
  const { openWithMessage } = useHealthCompanion();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vaultReadiness, setVaultReadiness] = useState(null);
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const { user } = useContext(AuthContext);
  const {
    hasActiveTracking,
    order,
    agentLocation,
    estimatedArrival,
    loading: trackingLoading,
  } = useOrderTracking();

  const quickActions = [
    {
      title: "Browse medicines",
      description: "Explore categories and products",
      icon: "storefront",
      action: () => navigate("/categories"),
      theme: "bg-blue-500",
    },
    {
      title: "Upload prescription",
      description: "Scan and verify your prescription",
      icon: "upload_file",
      action: () => navigate("/prescriptions"),
      theme: "bg-emerald-500",
    },
    {
      title: "Track orders",
      description: "See order and delivery updates",
      icon: "package_2",
      action: () => navigate("/orders"),
      theme: "bg-purple-500",
    },
    {
      title: "Your cart",
      description: "Review items before checkout",
      icon: "shopping_cart",
      action: () => navigate("/cart"),
      theme: "bg-orange-500",
    },
  ];

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
    const isCustomer = String(user?.role || "").toLowerCase() === "customer";
    if (!isCustomer) {
      setPendingAlerts([]);
      return;
    }

    let active = true;
    const loadAlerts = async () => {
      try {
        const { data } = await getPendingAlerts();
        if (active) {
          setPendingAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
        }
      } catch {
        setPendingAlerts([]);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.role]);

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

  useEffect(() => {
    const isCustomer = String(user?.role || "").toLowerCase() === "customer";
    if (!isCustomer) {
      setVaultReadiness(null);
      return;
    }

    let active = true;
    const loadReadiness = async () => {
      try {
        const { data } = await getVaultReadiness();
        if (!active) return;
        setVaultReadiness(data || null);
      } catch {
        if (!active) return;
        setVaultReadiness(null);
      }
    };

    loadReadiness();
    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    const isCustomer = String(user?.role || "").toLowerCase() === "customer";
    if (!isCustomer) {
      setTodaySchedule([]);
      return;
    }

    let active = true;
    const loadTodaySchedule = async () => {
      try {
        const { data } = await getTodayReminders();
        if (!active) return;
        setTodaySchedule(Array.isArray(data?.schedule) ? data.schedule : []);
      } catch {
        if (!active) return;
        setTodaySchedule([]);
      }
    };

    loadTodaySchedule();
    return () => {
      active = false;
    };
  }, [user?.role]);

  const upcomingDoses = useMemo(
    () => todaySchedule.slice(0, 3),
    [todaySchedule],
  );

  const allTaken =
    todaySchedule.length > 0 &&
    todaySchedule.every((entry) => normalizeStatus(entry.status) === "taken");

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
        {!trackingLoading && hasActiveTracking ? (
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 mt-24">
            <LiveTrackingCard
              order={order}
              agentLocation={agentLocation}
              estimatedArrival={estimatedArrival}
            />
          </div>
        ) : null}

        <Hero
          categories={displayCategories}
          hasActiveTracking={hasActiveTracking}
          agentLocation={agentLocation}
        />

        {todaySchedule.length > 0 ? (
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 mt-10">
            <div className="rounded-[40px] border border-slate-800 bg-[#08111d] p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Today's Medicines
                  </p>
                  <h2 className="mt-3 text-3xl font-black text-white">
                    Keep your day on schedule
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Your next doses are listed here for quick reference.
                  </p>
                </div>

                <Link
                  to="/reminders"
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100"
                >
                  View all reminders
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </Link>
              </div>

              {allTaken ? (
                <div className="mt-6 rounded-[28px] border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
                  <p className="text-lg font-black">All done!</p>
                  <p className="mt-2 text-sm text-emerald-200/80">
                    Every scheduled medicine has been marked as taken today.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {upcomingDoses.map((dose) => {
                  const status = normalizeStatus(dose.status);
                  const badge =
                    status === "taken"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-[#234861] bg-[#0d1424] text-slate-300";

                  return (
                    <div
                      key={`${dose.reminderId}-${dose.time}`}
                      className="rounded-[28px] border border-[#17334c] bg-[#0d1424] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-black text-white">
                          {dose.medicineName}
                        </p>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badge}`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">
                        {formatTimeLabel(dose.time)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Dose Alerts Card */}
        {pendingAlerts.length > 0 && (
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 mt-10">
            <div className="rounded-[40px] border-l-4 border-l-danger border border-slate-100 dark:border-danger/20 bg-white dark:bg-slate-900 p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-danger">
                    ⚠️ Action Required
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                    {pendingAlerts.length} critical dose
                    {pendingAlerts.length !== 1 ? "s" : ""} need
                    {pendingAlerts.length !== 1 ? "" : "s"} response
                  </p>
                </div>
                <Link
                  to="/dose-history"
                  className="px-6 py-3 rounded-2xl bg-danger text-white font-black hover:bg-danger-dark transition-colors"
                >
                  Respond now
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openWithMessage(
                      `I have ${pendingAlerts.length} pending dose alerts. Help me prioritize what to do now.`,
                    )
                  }
                  className="px-6 py-3 rounded-2xl border border-danger/30 bg-danger/10 text-danger font-black hover:bg-danger/20 transition-colors"
                >
                  Ask companion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adherence Today Stats */}
        {todaySchedule.length > 0 && (
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 mt-10">
            <div className="rounded-[40px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              {(() => {
                const takenCount = todaySchedule.filter(
                  (d) => normalizeStatus(d.status) === "taken",
                ).length;
                const totalCount = todaySchedule.length;
                const percentage = Math.round((takenCount / totalCount) * 100);
                const color =
                  percentage === 100
                    ? "text-success"
                    : percentage >= 50
                      ? "text-amber-500"
                      : "text-danger";
                return (
                  <Link to="/dose-history" className="block">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Adherence Today
                    </p>
                    <p className={`mt-2 text-2xl font-black ${color}`}>
                      {takenCount} / {totalCount} doses taken
                    </p>
                  </Link>
                );
              })()}
            </div>
          </div>
        )}

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
          <section>
            <div className="flex items-center justify-between mb-16 px-4">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Quick Actions
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Jump to what you need most
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="group relative overflow-hidden rounded-[48px] bg-white dark:bg-slate-900 p-10 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 text-left flex flex-col gap-10 h-full w-full"
                >
                  <div
                    className={`size-20 rounded-[28px] ${action.theme} flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <span className="material-symbols-outlined text-4xl font-black">
                      {action.icon}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      {action.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-6 flex items-center justify-between text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Open section
                    </span>
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {String(user?.role || "").toLowerCase() === "customer" &&
          vaultReadiness ? (
            <section className="panel-soft rounded-[40px] p-6 md:p-8">
              <Link
                to="/vault"
                className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ink-soft">
                    Medicine Vault
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    Vault readiness
                  </h2>
                  {vaultReadiness.status !== "green" ? (
                    <p className="mt-2 text-sm text-warning font-semibold">
                      {Number(vaultReadiness.expiredItems || 0) +
                        Number(vaultReadiness.expiringSoon || 0) +
                        Number(vaultReadiness.outOfStock || 0)}{" "}
                      item(s) need attention
                    </p>
                  ) : null}
                </div>

                <div className="inline-flex items-center gap-3 rounded-2xl border border-border-subtle bg-white/80 px-4 py-3">
                  <span
                    className={`inline-block size-3 rounded-full ${
                      vaultReadiness.status === "green"
                        ? "bg-success"
                        : vaultReadiness.status === "yellow"
                          ? "bg-warning"
                          : "bg-danger"
                    }`}
                  ></span>
                  <span className="text-2xl font-black text-ink">
                    {vaultReadiness.score}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
                    {vaultReadiness.status}
                  </span>
                </div>
              </Link>
            </section>
          ) : null}

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

      {String(user?.role || "").toLowerCase() === "customer" ? (
        <Link
          to="/emergency"
          className="fixed bottom-8 right-8 z-[100] group uiverse-emergency-launcher"
          aria-label="Emergency medicine relay"
        >
          <span className="pointer-events-none absolute -top-10 right-0 hidden whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-lg group-hover:block group-focus-visible:block">
            Emergency medicine relay
          </span>
          <div className="background-button" aria-hidden="true">
            <span className="button">SOS</span>
          </div>
          <div className="emergency">
            <p className="uiverse-emergency-kicker">24/7 Helpline</p>
            <p className="uiverse-emergency-label">Emergency</p>
          </div>
        </Link>
      ) : null}

      <Footer />
    </div>
  );
};

export default Home;
