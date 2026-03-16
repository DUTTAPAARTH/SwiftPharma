import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../services/apiClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

const cardBase =
  "rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5 transition-all hover:border-cyan-500/45";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const numberFormat = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

const growthClass = (value) =>
  Number(value || 0) >= 0 ? "text-green-300" : "text-red-300";
const growthArrow = (value) => (Number(value || 0) >= 0 ? "up" : "down");

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get("/admin/analytics/summary");
        setSummary(data || null);
      } catch (_) {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const statTiles = useMemo(
    () => [
      {
        key: "orders",
        icon: "local_shipping",
        iconColor: "text-blue-300 bg-blue-500/15",
        label: "Orders This Month",
        value: numberFormat(summary?.ordersThisMonth),
        sub: `${Number(summary?.orderGrowth || 0).toFixed(1)}% vs last month`,
        subColor: growthClass(summary?.orderGrowth),
        trend: Number(summary?.orderGrowth || 0),
      },
      {
        key: "pendingOrders",
        icon: "clinical_notes",
        iconColor: "text-amber-300 bg-amber-500/15",
        label: "Pending Orders",
        value: numberFormat(summary?.pendingOrders),
        sub: "Needs operational attention",
        subColor: "text-amber-200",
        pulse: Number(summary?.pendingOrders || 0) > 0,
        trend: 1,
      },
      {
        key: "users",
        icon: "group",
        iconColor: "text-cyan-300 bg-cyan-500/15",
        label: "New Users This Month",
        value: numberFormat(summary?.newUsersThisMonth),
        sub: `${Number(summary?.userGrowth || 0).toFixed(1)}% vs last month`,
        subColor: growthClass(summary?.userGrowth),
        trend: Number(summary?.userGrowth || 0),
      },
      {
        key: "revenue",
        icon: "currency_rupee",
        iconColor: "text-green-300 bg-green-500/15",
        label: "Revenue This Month",
        value: inr(summary?.revenueThisMonth),
        sub: `${Number(summary?.revenueGrowth || 0).toFixed(1)}% vs last month`,
        subColor: growthClass(summary?.revenueGrowth),
        trend: Number(summary?.revenueGrowth || 0),
      },
    ],
    [summary],
  );

  const sparklineData = useMemo(() => {
    const points = Array.isArray(summary?.revenueLast7Days)
      ? summary.revenueLast7Days
      : [];
    return {
      labels: points.map((p) => String(p.date || "").slice(5)),
      datasets: [
        {
          label: "Revenue",
          data: points.map((p) => Number(p.revenue || 0)),
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34, 211, 238, 0.16)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }, [summary]);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? [...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className={`${cardBase} h-[170px] animate-pulse`}
                />
              ))
            : statTiles.map((tile) => (
                <div
                  key={tile.key}
                  className={`${cardBase} text-left ${tile.pulse ? "animate-pulse border-amber-400/60" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`size-11 rounded-xl flex items-center justify-center ${tile.iconColor}`}
                    >
                      <span className="material-symbols-outlined">
                        {tile.icon}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold ${tile.subColor} inline-flex items-center gap-1`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        trending_{growthArrow(tile.trend)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-4 text-4xl font-black text-white tracking-tight">
                    {tile.value}
                  </p>
                  <p className="text-sm font-semibold text-slate-300 mt-1">
                    {tile.label}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${tile.subColor}`}>
                    {tile.sub}
                  </p>
                </div>
              ))}
        </div>

        <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-white">
              Revenue Last 7 Days
            </h2>
            <Link
              to="/admin/analytics"
              className="text-cyan-300 text-xs font-semibold hover:underline"
            >
              Open full analytics
            </Link>
          </div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-xl bg-[#121d34]" />
          ) : !summary?.revenueLast7Days?.length ? (
            <div className="grid h-56 place-items-center rounded-xl border border-dashed border-[#1f2b4a] text-sm text-slate-400">
              No revenue trend data available.
            </div>
          ) : (
            <div className="h-56">
              <Line
                data={sparklineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      ticks: { color: "#94a3b8" },
                      grid: { color: "rgba(148,163,184,.12)" },
                    },
                    x: {
                      ticks: { color: "#94a3b8" },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5">
          <h2 className="text-xl font-black text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link
              to="/admin/products?openAdd=1"
              className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20"
            >
              Add New Medicine
            </Link>
            <Link
              to="/admin/prescriptions"
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-500/20"
            >
              Review Pending Prescriptions (
              {numberFormat(summary?.pendingPrescriptions)})
            </Link>
            <Link
              to="/admin/orders"
              className="rounded-xl border border-blue-500/35 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-200 hover:bg-blue-500/20"
            >
              Manage Orders
            </Link>
            <Link
              to="/admin/users"
              className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-200 hover:bg-green-500/20"
            >
              User Management
            </Link>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
