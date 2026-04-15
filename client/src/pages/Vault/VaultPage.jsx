import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/common/Button";
import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../hooks/useCart";
import apiClient from "../../services/apiClient";
import {
  deleteVaultItem,
  getReadiness,
  getVault,
  reorderVaultItem,
  updateVaultItem,
} from "../../services/vaultService";
import VaultItemModal from "./VaultItemModal";
import { useHealthCompanion } from "../../context/HealthCompanionContext";

const RING_SIZE = 128;
const RING_STROKE = 10;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const statusLabel = {
  green: "Ready",
  yellow: "Needs review",
  red: "Critical",
};

const daysLabel = (days) => {
  if (days < 0) return "Expired";
  if (days <= 14) return `${days} days left`;
  return null;
};

const criticalDotClass = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-success",
};

const scoreColorClass = (status) => {
  if (status === "green") return "text-success";
  if (status === "yellow") return "text-warning";
  return "text-danger";
};

const classifySection = (item) => {
  if (item.quantity === 0 || item.expiryStatus === "expired") return "needs";
  if (item.expiryStatus === "critical") return "needs";
  if (item.expiryStatus === "warning") return "soon";
  return "stocked";
};

const parseAISuggestions = (result) => {
  if (Array.isArray(result)) return result;
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }
  return [];
};

const VaultPage = () => {
  const { user } = useContext(AuthContext);
  const { addItem } = useCart();
  const { openWithMessage } = useHealthCompanion();
  const [items, setItems] = useState([]);
  const [readiness, setReadiness] = useState({
    score: 0,
    status: "red",
    total: 0,
    expiredItems: 0,
    expiringSoon: 0,
    outOfStock: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modalState, setModalState] = useState({
    open: false,
    mode: "add",
    data: null,
  });
  const [menuOpenFor, setMenuOpenFor] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debounceTimersRef = useRef(new Map());

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const loadVault = async () => {
    const [{ data: vaultData }, { data: readinessData }] = await Promise.all([
      getVault(),
      getReadiness(),
    ]);

    setItems(Array.isArray(vaultData?.items) ? vaultData.items : []);
    setReadiness(readinessData || readiness);
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      setLoading(true);
      try {
        await loadVault();
      } catch {
        if (!mounted) return;
        notify("Failed to load vault");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    boot();
    return () => {
      mounted = false;
      for (const timer of debounceTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      debounceTimersRef.current.clear();
    };
  }, []);

  const sections = useMemo(() => {
    const grouped = { needs: [], soon: [], stocked: [] };
    for (const item of items) {
      grouped[classifySection(item)].push(item);
    }
    return grouped;
  }, [items]);

  const progressOffset = useMemo(() => {
    const safe = Math.max(0, Math.min(100, Number(readiness.score || 0)));
    return CIRCUMFERENCE - (safe / 100) * CIRCUMFERENCE;
  }, [readiness.score]);

  const refreshReadiness = async () => {
    try {
      const { data } = await getReadiness();
      setReadiness(data);
    } catch {
      notify("Failed to refresh readiness");
    }
  };

  const scheduleQuantitySync = (itemId, quantity) => {
    if (debounceTimersRef.current.has(itemId)) {
      window.clearTimeout(debounceTimersRef.current.get(itemId));
    }

    const timer = window.setTimeout(async () => {
      try {
        await updateVaultItem(itemId, { quantity });
      } catch {
        notify("Failed to update quantity");
      }
    }, 500);

    debounceTimersRef.current.set(itemId, timer);
  };

  const adjustQuantity = (item, delta) => {
    const next = Math.max(0, Number(item.quantity || 0) + delta);
    setItems((prev) =>
      prev.map((v) => (v._id === item._id ? { ...v, quantity: next } : v)),
    );
    scheduleQuantitySync(item._id, next);
  };

  const removeItem = async (id) => {
    try {
      await deleteVaultItem(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      notify("Removed from vault");
      refreshReadiness();
    } catch {
      notify("Failed to remove item");
    }
  };

  const reorderItem = async (item) => {
    try {
      const { data } = await reorderVaultItem(item._id);
      if (data?.cartItem) {
        addItem(data.cartItem, 1);
      }
      notify(data?.message || "Added to cart");
    } catch (error) {
      notify(error?.response?.data?.message || "Product not found in catalog");
    }
  };

  const openAddModal = (prefill = null) => {
    setModalState({
      open: true,
      mode: "add",
      data: prefill,
    });
  };

  const openEditModal = (item) => {
    setModalState({ open: true, mode: "edit", data: item });
    setMenuOpenFor("");
  };

  const loadAISuggestions = async () => {
    if (suggestionsLoaded || suggestionsLoading) return;
    setSuggestionsLoading(true);
    try {
      const { data } = await apiClient.post("/ai", {
        prompt:
          'Based on common Indian household medical needs and chronic disease management, suggest 8 critical medicines every home should stock in their emergency vault. Respond only with a JSON array: [{ "name": string, "reason": string, "criticalLevel": "low"|"medium"|"high" }]',
      });
      const parsed = parseAISuggestions(data?.result);
      setSuggestions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoaded(true);
      setSuggestionsLoading(false);
    }
  };

  const toggleSuggestions = () => {
    const next = !suggestionsOpen;
    setSuggestionsOpen(next);
    if (next) {
      loadAISuggestions();
    }
  };

  const renderSection = (title, itemsInSection) => {
    if (!itemsInSection.length) return null;

    return (
      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-ink-soft">
          {title}
        </h3>
        <div className="grid gap-3">
          {itemsInSection.map((item) => {
            const expiryTag = daysLabel(item.daysUntilExpiry);
            const expiryClass =
              item.expiryStatus === "expired"
                ? "border-danger/30 bg-danger/10 text-danger"
                : item.daysUntilExpiry <= 14
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-border-subtle bg-background-light text-ink-soft";

            return (
              <article
                key={item._id}
                className="rounded-2xl border border-border-subtle bg-white p-4 shadow-soft"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-ink">
                        {item.productName}
                      </span>
                      <span
                        className={`inline-block size-2 rounded-full ${criticalDotClass[item.criticalLevel] || "bg-warning"}`}
                      ></span>
                    </div>
                    <p className="text-xs text-ink-soft">Unit: {item.unit}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${expiryClass}`}
                      >
                        {item.expiryStatus === "expired"
                          ? "Expired"
                          : expiryTag ||
                            `Expires ${new Date(item.expiryDate).toLocaleDateString("en-IN")}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-border-subtle bg-background-light">
                      <button
                        className="px-3 py-2 text-lg font-black text-ink"
                        onClick={() => adjustQuantity(item, -1)}
                      >
                        -
                      </button>
                      <span className="min-w-10 text-center text-sm font-black text-ink">
                        {item.quantity}
                      </span>
                      <button
                        className="px-3 py-2 text-lg font-black text-ink"
                        onClick={() => adjustQuantity(item, 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="rounded-xl border border-border-subtle px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft"
                      onClick={() =>
                        setMenuOpenFor((prev) =>
                          prev === item._id ? "" : item._id,
                        )
                      }
                    >
                      Actions
                    </button>
                  </div>
                </div>

                {menuOpenFor === item._id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="!px-4 !py-2 !text-xs"
                      onClick={() => openEditModal(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="!px-4 !py-2 !text-xs"
                      onClick={() => reorderItem(item)}
                    >
                      Reorder
                    </Button>
                    <Button
                      variant="outline"
                      className="!border-danger !text-danger !px-4 !py-2 !text-xs"
                      onClick={() => removeItem(item._id)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 space-y-6">
        {toast ? (
          <div className="fixed right-6 top-6 z-[150] rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success shadow-soft">
            {toast}
          </div>
        ) : null}

        <section className="panel-soft rounded-[32px] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink-soft">
                Medicine Vault
              </p>
              <h1 className="mt-2 text-3xl font-nexus-bold text-ink">
                Emergency readiness
              </h1>
            </div>
            <button
              className="rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm text-ink-soft"
              onClick={refreshReadiness}
              title="Refresh"
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              openWithMessage(
                `Review my vault readiness score ${readiness.score}. Suggest priority actions for expired, expiring, and out-of-stock medicines.`,
              )
            }
            className="mt-4 rounded-xl border border-teal-300/40 bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-teal-800 hover:bg-teal-100"
          >
            Ask health companion about my vault
          </button>

          <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative inline-flex h-36 w-36 items-center justify-center">
              <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="currentColor"
                  className="text-border-subtle"
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="currentColor"
                  className={scoreColorClass(readiness.status)}
                  strokeWidth={RING_STROKE}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-3xl font-black text-ink">
                  {readiness.score}
                </p>
                <p
                  className={`text-xs font-bold uppercase tracking-[0.14em] ${scoreColorClass(readiness.status)}`}
                >
                  {statusLabel[readiness.status] || "Critical"}
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-wrap gap-2">
              <span className="rounded-full border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {readiness.expiredItems} expired
              </span>
              <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                {readiness.expiringSoon} expiring soon
              </span>
              <span className="rounded-full border border-border-subtle bg-background-light px-3 py-2 text-xs font-semibold text-ink-soft">
                {readiness.outOfStock} out of stock
              </span>
            </div>
          </div>
        </section>

        <section className="panel-soft rounded-[32px] p-6">
          <button
            className="flex w-full items-center justify-between gap-3"
            onClick={toggleSuggestions}
          >
            <span className="text-left">
              <span className="block text-sm font-black uppercase tracking-[0.18em] text-ink-soft">
                Suggested critical medicines
              </span>
              <span className="block text-lg font-nexus-bold text-ink">
                AI-powered vault planning
              </span>
            </span>
            <span className="material-symbols-outlined text-ink-soft">
              {suggestionsOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {suggestionsOpen ? (
            <div className="mt-4 grid gap-2">
              {suggestionsLoading ? (
                <p className="text-sm text-ink-soft">Loading suggestions...</p>
              ) : null}
              {!suggestionsLoading && !suggestions.length ? (
                <p className="text-sm text-ink-soft">
                  Suggestions unavailable right now
                </p>
              ) : null}
              {suggestions.map((item, idx) => (
                <article
                  key={`${item.name}-${idx}`}
                  className="rounded-xl border border-border-subtle bg-white p-3"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-ink">{item.name}</p>
                      <p className="text-sm text-ink-soft">{item.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                        {item.criticalLevel || "medium"}
                      </span>
                      <Button
                        variant="secondary"
                        className="!px-3 !py-2 !text-xs"
                        onClick={() =>
                          openAddModal({
                            productName: item.name,
                            criticalLevel: item.criticalLevel || "medium",
                          })
                        }
                      >
                        + Add to vault
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-nexus-bold text-ink">Vault Items</h2>
            <Button onClick={() => openAddModal()}>Add item</Button>
          </div>

          {loading ? (
            <p className="text-sm text-ink-soft">Loading vault...</p>
          ) : null}

          {!loading && !items.length ? (
            <div className="panel-soft rounded-[32px] p-10 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <svg
                  viewBox="0 0 24 24"
                  className="h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
                  <path d="M9 12h6" />
                  <path d="M12 9v6" />
                </svg>
              </div>
              <h3 className="text-2xl font-nexus-bold text-ink">
                Your vault is empty
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                Add critical medicines to track expiry and get refill reminders
              </p>
              <Button className="mt-5" onClick={() => openAddModal()}>
                Add first item
              </Button>
            </div>
          ) : null}

          {!loading && items.length ? (
            <div className="space-y-6">
              {renderSection("Needs attention", sections.needs)}
              {renderSection("Expiring soon", sections.soon)}
              {renderSection("Stocked", sections.stocked)}
            </div>
          ) : null}
        </section>

        {String(user?.role || "").toLowerCase() !== "customer" ? (
          <p className="text-xs text-ink-soft">
            Vault is intended for customer accounts.
          </p>
        ) : null}

        <div className="pt-4">
          <Link to="/categories" className="text-sm font-semibold text-primary">
            Browse medicines
          </Link>
        </div>
      </main>
      <Footer />

      <VaultItemModal
        open={modalState.open}
        mode={modalState.mode}
        initialData={modalState.data}
        onClose={() => setModalState({ open: false, mode: "add", data: null })}
        onSaved={(message) => {
          notify(message);
          loadVault();
        }}
      />
    </div>
  );
};

export default VaultPage;
