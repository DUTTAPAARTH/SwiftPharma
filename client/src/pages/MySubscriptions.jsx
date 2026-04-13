import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  getMySubscriptions,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  updateSubscription,
} from "../services/subscriptionService";

const tabs = [
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "cancelled", label: "Cancelled" },
];

const freqLabel = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  bimonthly: "Every 2 months",
};

const reminderOptions = [
  { value: 1, label: "1 day before" },
  { value: 2, label: "2 days before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
];

const fallbackImage =
  "https://via.placeholder.com/120x120/0a0f1e/00bcd4?text=%F0%9F%92%8A";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const daysUntil = (value) => {
  if (!value) return null;
  const now = new Date();
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const statusBadge = (status) => {
  if (status === "active")
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (status === "paused")
    return "border-slate-400/30 bg-slate-500/15 text-slate-200";
  return "border-red-400/40 bg-red-500/15 text-red-200";
};

const countdownTone = (days) => {
  if (days === null) return "text-slate-300";
  if (days < 3) return "text-red-300";
  if (days <= 7) return "text-amber-300";
  return "text-emerald-300";
};

const EditModal = ({ subscription, onClose, onSave }) => {
  const [form, setForm] = useState({
    frequency: subscription.frequency || "monthly",
    quantity: subscription.product?.quantity || 1,
    reminderDaysBefore: subscription.reminderDaysBefore || 2,
    deliveryAddress: {
      street: subscription.deliveryAddress?.street || "",
      city: subscription.deliveryAddress?.city || "",
      state: subscription.deliveryAddress?.state || "",
      pincode: subscription.deliveryAddress?.pincode || "",
    },
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-cyan-400/30 bg-[#0a0f1e] p-6 md:p-7 space-y-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-black text-white">Edit Subscription</h3>
          <button
            onClick={onClose}
            className="size-10 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Frequency
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(freqLabel).map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setForm((prev) => ({ ...prev, frequency: value }))
                }
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  form.frequency === value
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Quantity
          </p>
          <div className="flex items-center gap-2 w-fit rounded-2xl border border-slate-700 bg-[#12192b] p-1.5">
            <button
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  quantity: Math.max(1, Number(prev.quantity || 1) - 1),
                }))
              }
              className="size-10 rounded-xl bg-[#0a0f1e] text-white"
            >
              -
            </button>
            <span className="w-10 text-center text-white font-black">
              {form.quantity}
            </span>
            <button
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  quantity: Number(prev.quantity || 1) + 1,
                }))
              }
              className="size-10 rounded-xl bg-cyan-500 text-[#0a0f1e] font-black"
            >
              +
            </button>
          </div>
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
                value={form.deliveryAddress[field.key]}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
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

        <label className="space-y-1 block">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Reminder
          </span>
          <select
            value={form.reminderDaysBefore}
            onChange={(event) =>
              setForm((prev) => ({
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
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 min-w-[180px] rounded-xl bg-cyan-400 text-[#0a0f1e] font-black py-3 hover:bg-cyan-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-w-[180px] rounded-xl border border-slate-700 bg-[#12192b] text-slate-200 font-bold py-3"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const CancelModal = ({ subscription, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(reason);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-red-400/40 bg-[#0a0f1e] p-6 space-y-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white">
          Cancel subscription for {subscription.product?.name}?
        </h3>

        <label className="space-y-1 block">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Reason (optional)
          </span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-[#12192b] px-3 py-2 text-sm text-white outline-none focus:border-red-400"
          >
            <option value="">Select reason</option>
            <option value="No longer needed">No longer needed</option>
            <option value="Too expensive">Too expensive</option>
            <option value="Switched medicine">Switched medicine</option>
            <option value="Doctor changed prescription">
              Doctor changed prescription
            </option>
            <option value="Other">Other</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 min-w-[180px] rounded-xl bg-red-500 text-white font-black py-3 hover:bg-red-400"
          >
            {saving ? "Cancelling..." : "Cancel Subscription"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-w-[180px] rounded-xl border border-slate-700 bg-[#12192b] text-slate-200 font-bold py-3"
          >
            Keep Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

const MySubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [editTarget, setEditTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadSubscriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMySubscriptions();
      setSubscriptions(
        Array.isArray(data?.subscriptions) ? data.subscriptions : [],
      );
    } catch (loadError) {
      setError("Failed to load subscriptions.");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    if (activeTab === "cancelled") {
      const limitDate = new Date(now);
      limitDate.setMonth(limitDate.getMonth() - 3);
      return subscriptions.filter(
        (item) =>
          item.status === "cancelled" &&
          (!item.cancelledAt || new Date(item.cancelledAt) >= limitDate),
      );
    }
    return subscriptions.filter((item) => item.status === activeTab);
  }, [subscriptions, activeTab]);

  const onPause = async (id) => {
    await pauseSubscription(id);
    await loadSubscriptions();
  };

  const onResume = async (id) => {
    await resumeSubscription(id);
    await loadSubscriptions();
  };

  const onSaveEdit = async (payload) => {
    await updateSubscription(editTarget._id, payload);
    setEditTarget(null);
    await loadSubscriptions();
  };

  const onConfirmCancel = async (reason) => {
    await cancelSubscription(cancelTarget._id, reason);
    setCancelTarget(null);
    await loadSubscriptions();
  };

  const renderEmptyState = () => (
    <div className="rounded-3xl border border-cyan-400/20 bg-[#11182c] p-12 text-center space-y-5">
      <div className="mx-auto size-20 rounded-3xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl">autorenew</span>
      </div>
      <h3 className="text-2xl font-black text-white">
        No active subscriptions
      </h3>
      <p className="text-slate-400 max-w-xl mx-auto">
        Subscribe to your regular medicines for hassle-free auto-refill every
        month.
      </p>
      <Link
        to="/categories"
        className="inline-flex rounded-xl bg-cyan-400 text-[#0a0f1e] font-black px-5 py-2.5"
      >
        Browse Medicines
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-32 space-y-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-white">My Subscriptions</h1>
            <p className="text-slate-400 mt-2">
              Auto-refill medicines - never run out
            </p>
          </div>
          <Link
            to="/categories"
            className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 px-4 py-2.5 font-bold"
          >
            Browse medicines to subscribe
          </Link>
        </section>

        <section className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest ${
                activeTab === tab.key
                  ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                  : "border-slate-700 bg-[#11182c] text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 rounded-3xl border border-slate-700 bg-[#11182c] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid gap-4">
            {filtered.map((subscription) => {
              const productDoc = subscription.product?.productId;
              const image =
                productDoc?.image || productDoc?.images?.[0] || fallbackImage;
              const days = daysUntil(subscription.nextRefillDate);
              const lastRefill =
                subscription.lastRefillDate ||
                subscription.lastOrderId?.createdAt ||
                null;

              return (
                <article
                  key={subscription._id}
                  className="rounded-3xl border border-slate-700 bg-[#11182c] p-4 lg:p-5"
                >
                  <div className="grid lg:grid-cols-[1.2fr_1.6fr_1fr] gap-4 items-center">
                    <div className="flex items-center gap-4">
                      <img
                        src={image}
                        alt={subscription.product?.name || "Medicine"}
                        className="size-20 rounded-2xl object-cover border border-slate-700"
                      />
                      <div>
                        <h3 className="text-lg font-black text-white leading-tight">
                          {subscription.product?.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {productDoc?.composition || "No composition info"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                        {freqLabel[subscription.frequency] || "Monthly"}
                      </span>
                      <p className="text-sm text-slate-200">
                        Next refill: {formatDate(subscription.nextRefillDate)}
                      </p>
                      <p className={`text-sm font-bold ${countdownTone(days)}`}>
                        {days === null
                          ? "date unavailable"
                          : days < 0
                            ? "overdue"
                            : `in ${days} days`}
                      </p>
                      <p className="text-sm text-slate-300">
                        Last refill: {lastRefill ? formatDate(lastRefill) : "-"}
                      </p>
                      <p className="text-sm text-slate-300">
                        {subscription.totalRefills || 0} refills completed
                      </p>
                    </div>

                    <div className="space-y-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(subscription.status)}`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            subscription.status === "active"
                              ? "bg-emerald-300 animate-pulse"
                              : subscription.status === "paused"
                                ? "bg-slate-300"
                                : "bg-red-300"
                          }`}
                        />
                        {subscription.status}
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        {subscription.status === "active" && (
                          <button
                            onClick={() => onPause(subscription._id)}
                            className="rounded-xl border border-slate-600 bg-[#0a0f1e] px-3 py-2 text-xs font-bold"
                          >
                            Pause
                          </button>
                        )}
                        {subscription.status === "paused" && (
                          <button
                            onClick={() => onResume(subscription._id)}
                            className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
                          >
                            Resume
                          </button>
                        )}
                        {(subscription.status === "active" ||
                          subscription.status === "paused") && (
                          <>
                            <button
                              onClick={() => setEditTarget(subscription)}
                              className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setCancelTarget(subscription)}
                              className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {editTarget && (
        <EditModal
          subscription={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={onSaveEdit}
        />
      )}

      {cancelTarget && (
        <CancelModal
          subscription={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={onConfirmCancel}
        />
      )}
    </div>
  );
};

export default MySubscriptions;
