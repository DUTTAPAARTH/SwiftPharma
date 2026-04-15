import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { fetchMyOrders } from "../../services/orderService";
import { useCart } from "../../hooks/useCart";

const statusLabelMap = {
  pending: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const statusBadgeClass = (status) => {
  if (status === "delivered") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "out_for_delivery") {
    return "bg-cyan-50 text-cyan-700 border-cyan-200";
  }
  if (status === "cancelled") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeOrders = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const OrderHistoryPage = () => {
  const { addItem } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await fetchMyOrders();
        if (!mounted) return;
        setOrders(normalizeOrders(data));
      } catch (fetchError) {
        if (!mounted) return;
        setOrders([]);
        setError(
          fetchError?.response?.data?.message ||
            "Unable to load your orders right now.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleOrders = useMemo(() => {
    const withStatus = orders.map((order) => ({
      ...order,
      statusKey: normalizeStatus(order.status),
    }));

    const filtered =
      filter === "all"
        ? withStatus
        : withStatus.filter((order) => order.statusKey === filter);

    const sorted = [...filtered].sort((a, b) => {
      const first = new Date(a.createdAt).getTime() || 0;
      const second = new Date(b.createdAt).getTime() || 0;
      return sortBy === "newest" ? second - first : first - second;
    });

    return sorted;
  }, [orders, filter, sortBy]);

  const reorder = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!items.length) {
      toast.error("No items available to reorder.");
      return;
    }

    let addedCount = 0;
    items.forEach((item, index) => {
      const quantity = Math.max(1, Number(item?.quantity || 1));
      const productId = String(item?.product || item?.productId || item?._id || "").trim();

      if (!productId) return;

      addItem(
        {
          id: productId,
          productId,
          name: item?.name || `Medicine ${index + 1}`,
          price: Number(item?.price || 0),
          mrp: Number(item?.mrp || item?.price || 0),
          isRx:
            Boolean(item?.isRx) ||
            Boolean(item?.requiresRx) ||
            Boolean(item?.isRxRequired),
          requiresRx:
            Boolean(item?.requiresRx) ||
            Boolean(item?.isRx) ||
            Boolean(item?.isRxRequired),
        },
        quantity,
      );
      addedCount += 1;
    });

    if (!addedCount) {
      toast.error("No catalog-linked items found for reorder.");
      return;
    }

    toast.success(`Reordered ${addedCount} item${addedCount > 1 ? "s" : ""} to cart.`);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              Order History
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              My Orders
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              View order status, track deliveries, and reorder quickly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
            Loading orders...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm font-semibold">
            {error}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-4">
            <p className="text-2xl font-black text-slate-900 dark:text-white">No orders yet</p>
            <p className="text-slate-500">Place your first order to see history here.</p>
            <Link
              to="/home"
              className="inline-flex h-11 px-5 items-center justify-center rounded-lg bg-primary text-white text-sm font-black uppercase tracking-wider"
            >
              Go to Home
            </Link>
          </div>
        ) : (
          <section className="grid gap-4">
            {visibleOrders.map((order) => {
              const statusKey = normalizeStatus(order.status);
              const firstItem = order?.items?.[0];
              const moreCount = Math.max(0, Number(order?.items?.length || 0) - 1);
              return (
                <article
                  key={order._id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Order #{String(order._id || "").slice(-6).toUpperCase()}
                      </p>
                      <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                      <div className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
                        {firstItem?.name || "Medicine"}
                        {moreCount > 0 ? ` + ${moreCount} more` : ""}
                      </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${statusBadgeClass(statusKey)}`}
                      >
                        {statusLabelMap[statusKey] || statusKey || "Pending"}
                      </span>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {formatMoney(order.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      to={`/orders/${order._id}`}
                      className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center"
                    >
                      View Details
                    </Link>

                    {statusKey === "out_for_delivery" ? (
                      <Link
                        to={`/orders/${order._id}/track`}
                        className="h-10 px-4 rounded-lg border border-cyan-300 bg-cyan-50 text-cyan-700 text-sm font-bold inline-flex items-center justify-center"
                      >
                        Track Order
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => reorder(order)}
                      className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-bold"
                    >
                      Reorder
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrderHistoryPage;
