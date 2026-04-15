import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../services/apiClient";

const ORDER_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const STATUS_META = {
  pending: {
    label: "Pending",
    badge: "bg-slate-500/15 text-slate-200 border-slate-400/30",
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  },
  processing: {
    label: "Processing",
    badge: "bg-purple-500/15 text-purple-300 border-purple-400/30",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    badge: "bg-amber-500/15 text-amber-300 border-amber-400/30 animate-pulse",
  },
  delivered: {
    label: "Delivered",
    badge: "bg-green-500/15 text-green-300 border-green-400/30",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-red-500/15 text-red-300 border-red-400/30",
  },
};

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const timeAgo = (value) => {
  const date = new Date(value);
  const delta = Math.floor((Date.now() - date.getTime()) / 1000);
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

const statusLabel = (status) => STATUS_META[status]?.label || status;

const formatDynamicEta = (etaValue, nowMs) => {
  if (!etaValue) return "ETA unavailable";
  const etaMs = new Date(etaValue).getTime();
  if (Number.isNaN(etaMs)) return "ETA unavailable";

  const diffMs = etaMs - nowMs;
  if (diffMs <= 0) return "Arriving shortly";

  const mins = Math.max(1, Math.ceil(diffMs / 60000));
  return `ETA ~${mins} min`;
};

const showToast = (message, type = "success") => {
  const existing = document.getElementById("admin-orders-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "admin-orders-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "9999",
    padding: "12px 16px",
    borderRadius: "12px",
    background: type === "success" ? "#052e16" : "#450a0a",
    color: type === "success" ? "#6ee7b7" : "#fca5a5",
    border: `1px solid ${type === "success" ? "#10b981" : "#ef4444"}`,
    fontWeight: "700",
    fontSize: "13px",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
};

const FORWARD_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
];

const allowedNextStatuses = (current) => {
  if (current === "cancelled" || current === "delivered") return [];
  const idx = FORWARD_FLOW.indexOf(current);
  if (idx === -1) return [];
  // Allow jumping to any forward status
  const forward = FORWARD_FLOW.slice(idx + 1);
  return [...forward, "cancelled"];
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
};

const TableSkeleton = () => (
  <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[#121d34]" />
      ))}
    </div>
  </div>
);

const OrderDetailPanel = ({ order, onClose, onUpdate }) => {
  const [status, setStatus] = useState(order?.status || "pending");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const esc = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    setStatus(order?.status || "pending");
  }, [order]);

  if (!order) return null;

  const timelineSteps = [
    "pending",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
  ];

  const historyMap = new Map(
    (order.statusHistory || []).map((h) => [h.status, h]),
  );
  const currentIndex = timelineSteps.indexOf(order.status);
  const nextStatuses = allowedNextStatuses(order.status);

  const submitUpdate = async () => {
    if (!nextStatuses.includes(status)) return;
    setSaving(true);
    try {
      await onUpdate(order._id, status, note);
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-[#1a2540] bg-[#0a0f1e] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
              Order #{String(order._id).slice(0, 8)}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Order Details
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Placed {new Date(order.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#1a2540] bg-[#0d1424] p-2 text-slate-300 hover:text-white"
            aria-label="Close order details"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <section className="mb-5 rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
            Patient
          </h3>
          <p className="mt-3 text-lg font-bold text-white">
            {order.user?.name || "Unknown"}
          </p>
          <p className="text-sm text-slate-400">{order.user?.email || "N/A"}</p>
          <p className="text-sm text-slate-400">
            {order.user?.phone || "No phone"}
          </p>
          <div className="mt-3 rounded-xl border border-[#1a2540] bg-[#0a0f1e] p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Delivery Address
            </p>
            <p className="mt-1 text-sm text-slate-200">
              {order.address || "Not available"}
            </p>
          </div>
          {order.prescriptionId ? (
            <a
              href="/admin/prescriptions"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              <span className="material-symbols-outlined text-[18px]">
                clinical_notes
              </span>
              View Prescription
            </a>
          ) : null}
        </section>

        <section className="mb-5 rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
            Items
          </h3>
          <div className="mt-3 space-y-2">
            {(order.items || []).map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {item.product?.name || "Unknown Product"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Qty {item.quantity} x {currency(item.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-cyan-300">
                      {currency(item.subtotal)}
                    </p>
                    {item.product?.requiresRx ? (
                      <span className="mt-1 inline-flex rounded-full border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        Rx
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-[#1a2540] pt-3 text-right">
            <p className="text-sm text-slate-400">Total Amount</p>
            <p className="text-2xl font-black text-white">
              {currency(order.payment?.amount)}
            </p>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
            Status Timeline
          </h3>
          <ol className="mt-3 space-y-3">
            {timelineSteps.map((step, idx) => {
              const completed = idx <= currentIndex;
              const active = order.status === step;
              const entry = historyMap.get(step);
              return (
                <li key={step} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${active ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : completed ? "border-green-500/40 bg-green-500/15 text-green-300" : "border-[#2a3552] bg-[#10192f] text-slate-500"}`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-bold ${active ? "text-cyan-300" : completed ? "text-white" : "text-slate-500"}`}
                    >
                      {statusLabel(step)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry?.changedAt
                        ? new Date(entry.changedAt).toLocaleString("en-IN")
                        : "Pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
            Update Status
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-400/50"
            >
              <option value={order.status}>
                {statusLabel(order.status)} (Current)
              </option>
              {nextStatuses.map((next) => (
                <option key={next} value={next}>
                  {statusLabel(next)}
                </option>
              ))}
            </select>
            <button
              onClick={submitUpdate}
              disabled={saving || !nextStatuses.includes(status)}
              className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-[#001317] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Updating..." : "Update Status"}
            </button>
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional note"
            className="mt-3 w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
          />
        </section>
      </aside>
    </div>
  );
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeOrder, setActiveOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyRowId, setBusyRowId] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const statusTabs = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "pending", label: "Pending" },
      { key: "confirmed", label: "Confirmed" },
      { key: "processing", label: "Processing" },
      { key: "out_for_delivery", label: "Out for Delivery" },
      { key: "delivered", label: "Delivered" },
      { key: "cancelled", label: "Cancelled" },
    ],
    [],
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/admin/orders", {
        params: {
          page,
          limit: 20,
          status: statusFilter,
          search: search || undefined,
        },
      });
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setTotal(Number(data?.total || 0));
      setPages(Math.max(1, Number(data?.pages || 1)));
    } catch {
      setOrders([]);
      setTotal(0);
      setPages(1);
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 15000);

    return () => window.clearInterval(tickId);
  }, []);

  const openDetail = async (orderId) => {
    setDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/admin/orders/${orderId}`);
      setActiveOrder(data?.order || null);
    } catch {
      showToast("Unable to load order details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshOrderDetail = useCallback(async (orderId) => {
    const { data } = await apiClient.get(`/admin/orders/${orderId}`);
    setActiveOrder(data?.order || null);
  }, []);

  const applyStatusUpdate = async (orderId, status, note = "") => {
    const { data } = await apiClient.patch(`/admin/orders/${orderId}/status`, {
      status,
      note,
    });

    if (status === "out_for_delivery" && data?.autoAssignment?.assigned) {
      const agentName = data?.autoAssignment?.agent?.name || "Delivery Agent";
      const etaMinutes = Number(data?.autoAssignment?.agent?.etaMinutes || 0);
      showToast(
        `Out for delivery: ${agentName} assigned${etaMinutes ? `, ETA ~${etaMinutes} min` : ""}`,
      );
    } else {
      showToast(`Order moved to ${statusLabel(status)}`);
    }

    await Promise.all([loadOrders(), refreshOrderDetail(orderId)]);
  };

  const updateInline = async (order, nextStatus) => {
    if (!allowedNextStatuses(order.status).includes(nextStatus)) return;

    setBusyRowId(order._id);
    try {
      const { data } = await apiClient.patch(`/admin/orders/${order._id}/status`, {
        status: nextStatus,
        note: "",
      });

      if (nextStatus === "out_for_delivery" && data?.autoAssignment?.assigned) {
        const agentName = data?.autoAssignment?.agent?.name || "Delivery Agent";
        const etaMinutes = Number(data?.autoAssignment?.agent?.etaMinutes || 0);
        showToast(
          `Out for delivery: ${agentName} assigned${etaMinutes ? `, ETA ~${etaMinutes} min` : ""}`,
        );
      } else {
        showToast(`Order moved to ${statusLabel(nextStatus)}`);
      }

      await loadOrders();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Status update failed",
        "error",
      );
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <AdminLayout title="Orders">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">All Orders</h1>
              <p className="mt-1 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                {total} orders
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 md:flex-row lg:w-auto">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Search order ID or patient name"
                className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/60 md:w-[320px]"
              />
              <button
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
                className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-500/25"
              >
                Search
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusFilter === tab.key ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100" : "border-[#1a2540] bg-[#0a0f1e] text-slate-300"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-500">
              receipt_long
            </span>
            <p className="mt-3 text-lg font-bold text-white">No orders found</p>
            <p className="text-sm text-slate-400">
              Try changing filters or search terms.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#1a2540] bg-[#0d1424]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#101a2f] text-xs uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const firstItem = order.items?.[0]?.product?.name || "Item";
                    const nextStatuses = allowedNextStatuses(order.status);
                    return (
                      <tr
                        key={order._id}
                        className="border-t border-[#1a2540] text-slate-200"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {String(order._id).slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">
                            {order.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {order.user?.email || "N/A"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">
                            {order.itemCount} item(s)
                          </p>
                          <p className="text-xs text-slate-400">{firstItem}</p>
                        </td>
                        <td className="px-4 py-3 font-black text-cyan-300">
                          {currency(order.payment?.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                          {order.status === "out_for_delivery" ? (
                            <div className="mt-1.5 space-y-0.5 text-[11px] leading-tight">
                              <p className="text-cyan-200 font-semibold">
                                {order?.tracking?.deliveryAgentName
                                  ? `Agent: ${order.tracking.deliveryAgentName}`
                                  : "Agent auto-assigned"}
                              </p>
                              <p className="text-amber-200 font-bold">
                                {formatDynamicEta(
                                  order?.tracking?.estimatedDeliveryTime,
                                  nowTick,
                                )}
                              </p>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {timeAgo(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDetail(order._id)}
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-2.5 py-1.5 text-xs font-bold hover:border-cyan-400/40"
                            >
                              View
                            </button>
                            <select
                              value={order.status}
                              disabled={
                                busyRowId === order._id ||
                                nextStatuses.length === 0
                              }
                              onChange={(event) =>
                                updateInline(order, event.target.value)
                              }
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-2 py-1.5 text-xs text-slate-100 outline-none disabled:opacity-50"
                            >
                              <option value={order.status}>
                                {statusLabel(order.status)}
                              </option>
                              {nextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel(status)}
                                </option>
                              ))}
                            </select>
                            {order.status === "out_for_delivery" ? (
                              <Link
                                to={`/orders/${order._id}/track`}
                                className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
                              >
                                Live Map
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#1a2540] px-4 py-3">
              <p className="text-xs text-slate-400">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {detailLoading ? (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50">
            <div className="rounded-xl border border-[#1a2540] bg-[#0d1424] px-5 py-3 text-sm font-bold text-cyan-200">
              Loading order details...
            </div>
          </div>
        ) : null}

        {activeOrder ? (
          <OrderDetailPanel
            order={activeOrder}
            onClose={() => setActiveOrder(null)}
            onUpdate={applyStatusUpdate}
          />
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
