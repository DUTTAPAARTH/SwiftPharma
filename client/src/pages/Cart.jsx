import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { checkCartInteractions } from "../services/interactionService";
import { fetchLatestPrescriptionStatus } from "../services/prescriptionService";

const Cart = () => {
  const navigate = useNavigate();
  const { items, increment, decrement, removeItem, clear, total } = useCart();

  const [interactionWarnings, setInteractionWarnings] = useState([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxStatus, setRxStatus] = useState({
    exists: false,
    prescription: null,
  });

  const rxItems = useMemo(
    () => items.filter((item) => Boolean(item.isRx || item.requiresRx)),
    [items],
  );
  const hasRxItems = rxItems.length > 0;

  const hasSevereInteractions = useMemo(
    () =>
      interactionWarnings.some(
        (warning) => String(warning?.severity || "").toLowerCase() === "severe",
      ),
    [interactionWarnings],
  );

  const savings = useMemo(() => {
    return items.reduce((sum, item) => {
      const mrp = item.mrp || item.price * 1.2 || 0;
      const price = item.price || 0;
      return sum + (mrp - price) * item.quantity;
    }, 0);
  }, [items]);

  useEffect(() => {
    const names = items.map((item) => item.name).filter(Boolean);
    if (names.length < 2) {
      setInteractionWarnings([]);
      return;
    }

    let active = true;

    const loadInteractions = async () => {
      try {
        const data = await checkCartInteractions(names);
        if (!active) return;
        setInteractionWarnings(
          Array.isArray(data?.warnings) ? data.warnings : [],
        );
      } catch (error) {
        if (!active) return;
        setInteractionWarnings([]);
      }
    };

    loadInteractions();

    return () => {
      active = false;
    };
  }, [items]);

  useEffect(() => {
    if (!hasRxItems) {
      setRxStatus({ exists: false, prescription: null });
      return;
    }

    let active = true;

    const loadRxStatus = async () => {
      setRxLoading(true);
      try {
        const { data } = await fetchLatestPrescriptionStatus();
        if (!active) return;
        setRxStatus({
          exists: Boolean(data?.exists),
          prescription: data?.prescription || null,
        });
      } catch (error) {
        if (!active) return;
        setRxStatus({ exists: false, prescription: null });
      } finally {
        if (active) setRxLoading(false);
      }
    };

    loadRxStatus();

    return () => {
      active = false;
    };
  }, [hasRxItems]);

  const rxViewState = useMemo(() => {
    if (!hasRxItems) return "not_required";
    if (rxLoading) return "loading";
    if (!rxStatus.exists || !rxStatus.prescription) return "no_prescription";

    const status = rxStatus.prescription.status;
    if (["pending", "ai_reviewing", "awaiting_pharmacist"].includes(status))
      return "pending";
    if (["ai_rejected", "rejected"].includes(status)) return "rejected";

    const now = new Date();
    const expiry = rxStatus.prescription.expiryDate
      ? new Date(rxStatus.prescription.expiryDate)
      : null;

    if (
      status === "expired" ||
      rxStatus.prescription.isExpired ||
      (expiry && expiry < now)
    ) {
      return "expired";
    }

    if (status === "approved") return "approved";

    return "no_prescription";
  }, [hasRxItems, rxLoading, rxStatus]);

  const checkoutLockedByRx = hasRxItems && rxViewState !== "approved";
  const disableCheckout = hasSevereInteractions || checkoutLockedByRx;

  const checkoutTitle = hasSevereInteractions
    ? "Resolve severe drug interactions before proceeding"
    : checkoutLockedByRx
      ? "Upload and verify prescription to proceed"
      : "Proceed to checkout";

  const renderRxWidget = () => {
    if (!hasRxItems) return null;

    const rxNames = rxItems.map((item) => item.name).filter(Boolean);
    const prescription = rxStatus.prescription;

    if (rxLoading || rxViewState === "loading") {
      return (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <div className="flex items-center gap-3 text-amber-100">
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
            <p className="font-semibold">Checking prescription status...</p>
          </div>
        </div>
      );
    }

    if (rxViewState === "no_prescription") {
      return (
        <div className="rounded-2xl border border-red-400/35 bg-red-500/10 p-6 space-y-4">
          <h3 className="text-xl font-black text-red-100">
            Prescription Required
          </h3>
          <p className="text-red-100/90 text-sm">
            Your cart has {rxItems.length} prescription medicine
            {rxItems.length > 1 ? "s" : ""}.
          </p>
          <div className="flex flex-wrap gap-2">
            {rxNames.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="px-2 py-1 rounded-full text-xs border border-red-300/30 bg-red-500/15 text-red-100"
              >
                {name}
              </span>
            ))}
          </div>
          <Link
            to="/ai-prescription"
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 text-white font-bold px-5 py-2.5 hover:bg-red-400"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Upload Prescription
          </Link>
        </div>
      );
    }

    if (rxViewState === "pending") {
      const current = prescription?.status || "pending";
      const stages = ["Uploaded", "AI Review", "Pharmacist Review", "Approved"];
      const activeStageIndex =
        current === "pending"
          ? 0
          : current === "ai_reviewing"
            ? 1
            : current === "awaiting_pharmacist"
              ? 2
              : 0;

      return (
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-100">
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
            <h3 className="text-xl font-black">Prescription under review</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {stages.map((step, index) => (
              <div
                key={step}
                className={`rounded-lg border px-2 py-2 text-xs text-center font-semibold ${
                  index <= activeStageIndex
                    ? "border-amber-300/40 bg-amber-400/20 text-amber-100"
                    : "border-slate-600 bg-slate-800 text-slate-300"
                }`}
              >
                {step}
              </div>
            ))}
          </div>

          <p className="text-sm text-amber-100/90">
            Estimated approval time: 30 minutes.
          </p>
          <p className="text-sm text-amber-100/90">
            You'll be notified when approved.
          </p>
        </div>
      );
    }

    if (rxViewState === "rejected") {
      return (
        <div className="rounded-2xl border border-red-400/35 bg-red-500/10 p-6 space-y-4">
          <h3 className="text-xl font-black text-red-100">
            Prescription Rejected
          </h3>
          <p className="text-sm text-red-100/90">
            {prescription?.aiRejectionReason ||
              prescription?.pharmacistNotes ||
              "Your prescription could not be verified."}
          </p>
          <Link
            to="/ai-prescription"
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 text-white font-bold px-5 py-2.5 hover:bg-red-400"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Upload New Prescription
          </Link>
        </div>
      );
    }

    if (rxViewState === "expired") {
      return (
        <div className="rounded-2xl border border-red-400/35 bg-red-500/10 p-6 space-y-4">
          <h3 className="text-xl font-black text-red-100">
            Prescription Expired
          </h3>
          <p className="text-sm text-red-100/90">
            Prescriptions are valid for 6 months. Please upload a new
            prescription from your doctor.
          </p>
          <Link
            to="/ai-prescription"
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 text-white font-bold px-5 py-2.5 hover:bg-red-400"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Upload New Prescription
          </Link>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 space-y-3">
        <h3 className="text-xl font-black text-emerald-100">
          Prescription Verified ✓
        </h3>
        <p className="text-sm text-emerald-100/90">
          Approved at:{" "}
          {prescription?.approvedAt
            ? new Date(prescription.approvedAt).toLocaleString()
            : "Recently"}
        </p>
        {prescription?.pharmacistNotes && (
          <p className="text-sm text-emerald-100/90">
            Pharmacist note: {prescription.pharmacistNotes}
          </p>
        )}
        {prescription?.expiryDate && (
          <p className="text-sm text-emerald-100/90">
            Expires on: {new Date(prescription.expiryDate).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-nexus-bold">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-primary text-xs font-black uppercase tracking-widest">
              Cart
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Your Cart
            </h1>
            <p className="text-slate-500 mt-2">
              {items.length} item{items.length !== 1 ? "s" : ""} ready for
              checkout
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clear}
              className="h-11 px-5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 font-bold text-xs uppercase tracking-wider border border-red-100 dark:border-red-500/20"
            >
              Clear Cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center space-y-5">
            <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700">
              shopping_cart
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Your cart is empty
            </h2>
            <Link
              to="/categories"
              className="inline-flex px-6 py-3 rounded-xl bg-primary text-white font-bold"
            >
              Browse Medicines
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {renderRxWidget()}

              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <img
                      src={
                        item.image ||
                        "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300"
                      }
                      alt={item.name}
                      className="w-full sm:w-28 h-28 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-black text-xl text-slate-900 dark:text-white">
                            {item.name}
                          </p>
                          {item.isRx && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-400/30 bg-amber-500/15 text-amber-300">
                              Rx Required
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <span className="material-symbols-outlined">
                            delete
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrement(item.id)}
                            className="size-9 rounded-lg border border-slate-300 dark:border-slate-700"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increment(item.id)}
                            className="size-9 rounded-lg bg-primary text-white"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-black text-xl text-slate-900 dark:text-white">
                          ₹
                          {((item.price || 0) * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-28 rounded-2xl bg-slate-900 text-white p-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">
                    Order Summary
                  </p>
                  <h2 className="text-2xl font-black">Checkout</h2>
                </div>

                {interactionWarnings.length > 0 && (
                  <div
                    className={`rounded-xl p-3 border ${
                      hasSevereInteractions
                        ? "bg-red-500/20 border-red-400/50 text-red-100"
                        : "bg-amber-500/20 border-amber-400/50 text-amber-100"
                    }`}
                  >
                    {hasSevereInteractions
                      ? "Serious interaction detected. Resolve before checkout."
                      : "Potential interactions found. Please review carefully."}
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Savings</span>
                      <span>-₹{savings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-3 flex justify-between text-xl font-black">
                    <span>Total</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  title={checkoutTitle}
                  disabled={disableCheckout}
                  onClick={() => {
                    if (!disableCheckout) navigate("/checkout");
                  }}
                  className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 ${
                    disableCheckout
                      ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                      : "bg-primary hover:bg-primary-hover text-white"
                  }`}
                >
                  {disableCheckout && (
                    <span className="material-symbols-outlined">lock</span>
                  )}
                  {disableCheckout ? "Checkout Locked" : "Proceed to Checkout"}
                </button>

                {checkoutLockedByRx && (
                  <p className="text-xs text-red-300">
                    Upload and verify prescription to proceed.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
