import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { createOrder } from "../services/orderService";
import { fetchProducts } from "../services/productService";

const isMongoObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());

const normalizeMedicineName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b(tab|tablet|cap|capsule|inj|injection|syp|syrup)\.?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const pickBestCatalogMatch = (sourceName, candidates = []) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const normalizedSource = normalizeMedicineName(sourceName);
  if (!normalizedSource) return candidates[0] || null;

  const exact = candidates.find(
    (candidate) => normalizeMedicineName(candidate?.name) === normalizedSource,
  );
  if (exact) return exact;

  const includesMatch = candidates.find((candidate) => {
    const target = normalizeMedicineName(candidate?.name);
    return target.includes(normalizedSource) || normalizedSource.includes(target);
  });
  if (includesMatch) return includesMatch;

  return candidates[0] || null;
};

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position?.coords?.latitude);
        const lng = Number(position?.coords?.longitude);
        const accuracy = Number(position?.coords?.accuracy || 999);
        
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          reject(new Error("Invalid location coordinates"));
          return;
        }
        
        console.log(`[Checkout GPS] Location acquired: ${Math.round(accuracy)}m accuracy`);
        resolve({ lat, lng, accuracy });
      },
      () => {
        reject(new Error("Location permission denied"));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clear, replaceItem } = useCart();

  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Review
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "upi",
  });

  const hasRxItems = useMemo(() => items.some((item) => item.isRx), [items]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitAddress = (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.phone ||
      !formData.address ||
      !formData.city ||
      !formData.pincode
    ) {
      setError("Please fill in all required delivery details.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    setError("");
    setSubmitting(true);
    try {
      let location = deliveryLocation;
      if (!location) {
        try {
          location = await getCurrentLocation();
          setDeliveryLocation(location);
        } catch {
          // Non-blocking fallback: order can still proceed with typed address.
        }
      }

      let checkoutItems = [...items];

      const invalidItems = checkoutItems.filter(
        (item) => !isMongoObjectId(item?.productId || item?.id),
      );

      // Try to repair stale cart entries by matching medicine names to real catalog products.
      for (const invalidItem of invalidItems) {
        try {
          const products = await fetchProducts({
            search: invalidItem?.name || "",
            limit: 20,
          });
          const match = pickBestCatalogMatch(invalidItem?.name, products);
          if (!match?._id || !isMongoObjectId(match._id)) {
            continue;
          }

          const patchedItem = {
            ...invalidItem,
            id: String(match._id),
            productId: String(match._id),
            name: match.name || invalidItem.name,
            price: Number(match.price || invalidItem.price || 0),
            mrp: Number(match.mrp || match.price || invalidItem.mrp || invalidItem.price || 0),
            image: match.image || invalidItem.image,
            manufacturer: match.manufacturer || invalidItem.manufacturer,
            composition: match.composition || invalidItem.composition,
            strength: match.strength || invalidItem.strength,
          };

          replaceItem(invalidItem.id, patchedItem, invalidItem.quantity || 1);
          checkoutItems = checkoutItems.map((entry) =>
            entry.id === invalidItem.id || entry.productId === invalidItem.productId
              ? patchedItem
              : entry,
          );
        } catch {
          // Keep original item if remap fails.
        }
      }

      const unresolvedItems = checkoutItems.filter(
        (item) => !isMongoObjectId(item?.productId || item?.id),
      );

      if (unresolvedItems.length > 0) {
        const names = unresolvedItems
          .map((item) => item?.name)
          .filter(Boolean)
          .join(", ");
        setError(
          names
            ? `Some medicines are not linked to our catalog yet: ${names}. Please remove them from cart and add catalog alternatives before checkout.`
            : "Some medicines are not linked to our catalog yet. Please remove them from cart and add catalog alternatives before checkout.",
        );
        return;
      }

      await createOrder({
        items: checkoutItems.map((i) => ({
          product: i.productId || i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        deliveryLocation: location || undefined,
        payment: { method: formData.paymentMethod, amount: total },
      });
      clear();
      navigate("/orders", { state: { orderPlaced: true } });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "We couldn't place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-40 text-center space-y-12">
          <div className="size-40 rounded-[56px] bg-slate-50 dark:bg-slate-900 mx-auto flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner group">
            <span className="material-symbols-outlined text-8xl text-slate-200 dark:text-slate-800 group-hover:scale-110 transition-transform font-black">
              inventory_2
            </span>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Your cart is empty
            </h1>
            <p className="text-xl text-slate-500 font-medium">
              Add medicines from the catalog to start checkout.
            </p>
          </div>
          <Link
            to="/categories"
            className="inline-flex h-20 px-12 rounded-[28px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-primary hover:scale-[1.02] transition-all shadow-2xl items-center justify-center gap-4"
          >
            Browse categories{" "}
            <span className="material-symbols-outlined font-black">
              arrow_forward
            </span>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 pb-16 border-b border-slate-100 dark:border-slate-800 relative">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 backdrop-blur-md">
              <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
              Secure checkout
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Checkout
            </h1>
            <p className="text-xl text-slate-500 font-medium">
              Confirm delivery details, choose payment, and review your order.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 backdrop-blur-xl p-3 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-soft">
            {[
              { num: 1, label: "Delivery", icon: "distance" },
              { num: 2, label: "Payment", icon: "payments" },
              { num: 3, label: "Review", icon: "verified" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-3 px-6 py-4 rounded-[32px] transition-all duration-500 ${step === s.num ? "bg-slate-900 text-white shadow-2xl scale-105" : "text-slate-400"}`}
              >
                <div
                  className={`size-10 rounded-2xl flex items-center justify-center text-[10px] font-black tracking-widest transition-all ${
                    step >= s.num
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {s.num}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-8 rounded-[40px] bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 flex items-center gap-6 text-sm font-black">
            <span className="material-symbols-outlined text-4xl">warning</span>
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            {step === 1 && (
              <form
                onSubmit={handleSubmitAddress}
                className="bg-white dark:bg-slate-900 rounded-[64px] p-12 lg:p-14 border border-slate-100 dark:border-slate-800 shadow-soft space-y-12"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-5xl font-black">
                      location_on
                    </span>{" "}
                    Delivery address
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tell us where you want your order delivered.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-6">
                      Full name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      className="w-full h-20 px-10 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 focus:border-primary outline-none transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-6">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 00000 00000"
                      className="w-full h-20 px-10 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 focus:border-primary outline-none transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-6">
                    Street address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Apartment, street, landmark"
                    rows={4}
                    className="w-full px-10 py-8 rounded-[40px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 focus:border-primary outline-none transition-all font-bold resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-6">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full h-20 px-10 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 focus:border-primary outline-none transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-6">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                      className="w-full h-20 px-10 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 focus:border-primary outline-none transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-6">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="000 000"
                      className="w-full h-20 px-10 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 focus:border-primary outline-none transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-20 bg-primary text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  Continue to payment{" "}
                  <span className="material-symbols-outlined font-black">
                    token
                  </span>
                </button>
              </form>
            )}

            {step === 2 && (
              <div className="bg-white dark:bg-slate-900 rounded-[64px] p-12 lg:p-14 border border-slate-100 dark:border-slate-800 shadow-soft space-y-12">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary text-5xl font-black">
                        payments
                      </span>{" "}
                      Payment method
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Choose how you want to pay.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="h-12 px-6 rounded-full bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all border border-slate-100 dark:border-slate-700"
                  >
                    Edit address
                  </button>
                </div>

                <div className="p-10 rounded-[40px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-3 shadow-inner">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <span className="material-symbols-outlined text-sm font-black">
                      location_searching
                    </span>{" "}
                    Delivering to
                  </div>
                  <p className="font-bold text-xl text-slate-900 dark:text-white">
                    {formData.name}{" "}
                    <span className="text-slate-400 font-medium ml-2">
                      | {formData.address}, {formData.city}, {formData.pincode}
                    </span>
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-8">
                  {[
                    {
                      id: "upi",
                      label: "UPI",
                      icon: "contactless",
                      desc: "Fast and secure",
                      brands: "PhonePe • GPay • Paytm",
                    },
                    {
                      id: "card",
                      label: "Credit/Debit Card",
                      icon: "credit_card",
                      desc: "Visa, Mastercard, AMEX",
                      brands: "VISA • Mastercard • AMEX",
                    },
                    {
                      id: "netbanking",
                      label: "Net banking",
                      icon: "account_balance",
                      desc: "Direct Bank Transfer",
                      brands: "HDFC • ICICI • SBI",
                    },
                    {
                      id: "cod",
                      label: "Cash on delivery",
                      icon: "handshake",
                      desc: "Pay when it arrives",
                      brands: "Cash • UPI Terminal",
                    },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`p-10 rounded-[48px] border-2 cursor-pointer transition-all flex flex-col gap-6 relative group ${
                        formData.paymentMethod === method.id
                          ? "border-primary bg-primary/5 shadow-2xl scale-[1.02]"
                          : "border-slate-100 dark:border-slate-800 hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={formData.paymentMethod === method.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-6">
                        <div
                          className={`size-16 rounded-[24px] flex items-center justify-center transition-all ${formData.paymentMethod === method.id ? "bg-primary text-white shadow-lg" : "bg-slate-50 dark:bg-slate-800 text-slate-300"}`}
                        >
                          <span className="material-symbols-outlined text-4xl font-black">
                            {method.icon}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                            {method.label}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {method.desc}
                          </p>
                        </div>
                      </div>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {method.brands}
                        </p>
                        {formData.paymentMethod === method.id && (
                          <div className="size-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-lg font-black">
                              check
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="w-full h-20 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  Review order{" "}
                  <span className="material-symbols-outlined font-black">
                    analytics
                  </span>
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="bg-white dark:bg-slate-900 rounded-[64px] p-12 lg:p-14 border border-slate-100 dark:border-slate-800 shadow-soft space-y-12">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary text-5xl font-black">
                        verified
                      </span>{" "}
                      Review and place order
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Check the details before you confirm.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="h-12 px-6 rounded-full bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all border border-slate-100 dark:border-slate-700"
                  >
                    Change payment
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="p-10 rounded-[40px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-6 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg font-black">
                            home_pin
                          </span>
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                          Delivery address
                        </h4>
                      </div>
                      <div className="space-y-2">
                        <p className="font-black text-2xl text-slate-900 dark:text-white leading-none">
                          {formData.name}
                        </p>
                        <p className="text-sm font-bold text-slate-500 max-w-xs">
                          {formData.address}, {formData.city},{" "}
                          {formData.pincode}
                        </p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest pt-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm font-black">
                            call
                          </span>{" "}
                          {formData.phone}
                        </p>
                      </div>
                    </div>
                    <div className="p-10 rounded-[40px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-6 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg font-black">
                            shield_with_heart
                          </span>
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                          Payment method
                        </h4>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="material-symbols-outlined text-5xl text-slate-400 font-black uppercase">
                          {formData.paymentMethod === "upi"
                            ? "contactless"
                            : formData.paymentMethod === "card"
                              ? "credit_card"
                              : "account_balance"}
                        </span>
                        <div className="space-y-1">
                          <p className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter">
                            {formData.paymentMethod.replace("_", " ")}
                          </p>
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                            Ready to process
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between px-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Order items
                      </h4>
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        {items.length} Units
                      </span>
                    </div>
                    <div className="space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar pr-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-8 rounded-[36px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center gap-6 group hover:border-primary/30 transition-all shadow-sm"
                        >
                          <div className="size-16 rounded-[20px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden p-2 group-hover:scale-110 transition-transform">
                            <img
                              src={
                                item.image ||
                                "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=100"
                              }
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter line-clamp-1 leading-none mb-1">
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Unit Factor X {item.quantity}
                            </p>
                          </div>
                          <p className="text-xl font-black text-primary tracking-tighter">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    className="w-full h-24 bg-primary text-white rounded-[40px] font-black text-sm uppercase tracking-widest shadow-[0_25px_50px_rgba(37,99,235,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-6 group"
                  >
                    {submitting ? (
                      <>
                        <div className="size-6 border-4 border-white/20 border-t-white animate-spin rounded-full"></div>
                        Placing your order...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-3xl font-black group-hover:rotate-12 transition-transform">
                          bolt
                        </span>
                        Place order • ₹{total.toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-12">
              <div className="bg-slate-900 text-white rounded-[64px] p-12 shadow-2xl space-y-10 relative overflow-hidden group border border-white/5">
                <div className="absolute top-0 right-0 size-80 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors pointer-events-none"></div>

                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Order summary
                  </p>
                  <h2 className="text-4xl font-black tracking-tighter leading-none">
                    Total amount
                  </h2>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Items total
                    </span>
                    <span className="font-black text-lg text-white">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Delivery fee
                    </span>
                    <span className="text-[10px] font-black uppercase text-green-400 tracking-widest bg-green-500/10 px-4 py-1.5 rounded-full">
                      Free
                    </span>
                  </div>
                  <div className="h-px bg-white/10 w-full my-4"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Grand total
                    </span>
                    <span className="text-5xl font-black text-primary tracking-tighter leading-none">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {hasRxItems && (
                  <div className="p-8 rounded-[40px] bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-5 relative z-10">
                    <div className="size-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl font-black">
                        prescriptions
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 text-left">
                        Prescription required
                      </p>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-left italic">
                        This order includes prescription medicines. A pharmacist
                        must approve the prescription before dispatch.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[48px] p-10 space-y-8 group hover:border-primary/30 transition-all shadow-soft">
                <div className="flex items-center gap-5">
                  <div className="size-16 rounded-[24px] bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined font-black text-4xl">
                      lock
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Secure payment
                    </p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      256-bit protected checkout
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Payments are processed through secure, PCI-DSS compliant
                  gateways to keep your checkout protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
