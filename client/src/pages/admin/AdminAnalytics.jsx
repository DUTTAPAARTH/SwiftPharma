import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../services/apiClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const card = "rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

const SkeletonCard = () => <div className={`${card} h-40 animate-pulse`} />;

const EmptyChart = ({ text }) => (
  <div className="grid h-64 place-items-center rounded-xl border border-dashed border-[#283558] bg-[#0a0f1e] text-sm text-slate-400">
    {text}
  </div>
);

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("daily");
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [topMedicines, setTopMedicines] = useState([]);
  const [rx, setRx] = useState(null);
  const [users, setUsers] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, revenueRes, topRes, rxRes, usersRes] =
          await Promise.all([
            apiClient.get("/admin/analytics/summary"),
            apiClient.get("/admin/analytics/revenue"),
            apiClient.get("/admin/analytics/top-medicines"),
            apiClient.get("/admin/analytics/prescriptions"),
            apiClient.get("/admin/analytics/users"),
          ]);

        setSummary(summaryRes?.data || null);
        setRevenue(revenueRes?.data || { daily: [], weekly: [], monthly: [] });
        setTopMedicines(
          Array.isArray(topRes?.data?.medicines) ? topRes.data.medicines : [],
        );
        setRx(rxRes?.data || null);
        setUsers(usersRes?.data || null);
      } catch (e) {
        setError(e?.response?.data?.message || "Unable to load analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selectedRevenue = useMemo(() => {
    const rows = Array.isArray(revenue?.[period]) ? revenue[period] : [];
    if (period === "daily") {
      return rows.map((r) => ({
        label: r.date?.slice(5) || "",
        value: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
      }));
    }
    if (period === "weekly") {
      return rows.map((r) => ({
        label: r.week || "",
        value: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
      }));
    }
    return rows.map((r) => ({
      label: r.month || "",
      value: Number(r.revenue || 0),
      orders: Number(r.orders || 0),
    }));
  }, [revenue, period]);

  const revenueChartData = useMemo(
    () => ({
      labels: selectedRevenue.map((d) => d.label),
      datasets: [
        {
          label: "Revenue",
          data: selectedRevenue.map((d) => d.value),
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34, 211, 238, 0.2)",
          pointRadius: 2,
          tension: 0.35,
          fill: true,
        },
      ],
    }),
    [selectedRevenue],
  );

  const medicineChartData = useMemo(
    () => ({
      labels: topMedicines.map((m) => m.name || "Unknown"),
      datasets: [
        {
          label: "Units sold",
          data: topMedicines.map((m) => Number(m.totalOrdered || 0)),
          backgroundColor: "rgba(56, 189, 248, 0.55)",
          borderColor: "rgba(14, 165, 233, 1)",
          borderWidth: 1,
        },
      ],
    }),
    [topMedicines],
  );

  const rxStatusData = useMemo(() => {
    const byStatus = rx?.byStatus || {};
    const values = [
      Number(byStatus.pending || 0),
      Number(byStatus.awaiting || 0),
      Number(byStatus.approved || 0),
      Number(byStatus.rejected || 0),
      Number(byStatus.ai_rejected || 0),
      Number(byStatus.expired || 0),
    ];
    return {
      labels: [
        "Pending",
        "Awaiting",
        "Approved",
        "Rejected",
        "AI Rejected",
        "Expired",
      ],
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#f59e0b",
            "#38bdf8",
            "#22c55e",
            "#ef4444",
            "#f97316",
            "#64748b",
          ],
          borderColor: "#0a0f1e",
          borderWidth: 2,
        },
      ],
    };
  }, [rx]);

  const userRoleData = useMemo(() => {
    const byRole = users?.byRole || {};
    return {
      labels: ["Users", "Admins", "Pharmacists"],
      datasets: [
        {
          data: [
            Number(byRole.user || 0),
            Number(byRole.admin || 0),
            Number(byRole.pharmacist || 0),
          ],
          backgroundColor: ["#06b6d4", "#22c55e", "#a78bfa"],
          borderColor: "#0a0f1e",
          borderWidth: 2,
        },
      ],
    };
  }, [users]);

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <div className={card}>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Total Revenue
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {inr(summary?.totalRevenue)}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  This month: {inr(summary?.revenueThisMonth)}
                </p>
              </div>
              <div className={card}>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Orders
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {Number(summary?.totalOrders || 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Monthly growth: {pct(summary?.orderGrowth)}
                </p>
              </div>
              <div className={card}>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Users
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {Number(summary?.totalUsers || 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  New this month:{" "}
                  {Number(summary?.newUsersThisMonth || 0).toLocaleString(
                    "en-IN",
                  )}
                </p>
              </div>
              <div className={card}>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Prescription Approval
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {pct(summary?.prescriptionApprovalRate)}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Avg delivery:{" "}
                  {Number(summary?.avgDeliveryTime || 0).toFixed(1)} hrs
                </p>
              </div>
            </>
          )}
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white">Revenue Trend</h2>
            <div className="inline-flex rounded-xl border border-[#1a2540] bg-[#0a0f1e] p-1">
              {[
                { key: "daily", label: "Daily" },
                { key: "weekly", label: "Weekly" },
                { key: "monthly", label: "Monthly" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${period === opt.key ? "bg-cyan-500 text-[#001317]" : "text-slate-300"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-[#121d34]" />
          ) : selectedRevenue.length === 0 ? (
            <EmptyChart text="No revenue data available" />
          ) : (
            <div className="h-72">
              <Line
                data={revenueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={card}>
            <h2 className="mb-4 text-lg font-black text-white">
              Top Medicines
            </h2>
            {loading ? (
              <div className="h-64 animate-pulse rounded-xl bg-[#121d34]" />
            ) : topMedicines.length === 0 ? (
              <EmptyChart text="No medicine sales data available" />
            ) : (
              <div className="h-72">
                <Bar
                  data={medicineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            )}
          </div>

          <div className={card}>
            <h2 className="mb-4 text-lg font-black text-white">
              Prescription Status Mix
            </h2>
            {loading ? (
              <div className="h-64 animate-pulse rounded-xl bg-[#121d34]" />
            ) : !rx ? (
              <EmptyChart text="No prescription data available" />
            ) : (
              <div className="h-72">
                <Doughnut
                  data={rxStatusData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            )}
            {!loading && rx ? (
              <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-3">
                <div className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-2">
                  AI pass rate:{" "}
                  <span className="font-bold text-cyan-300">
                    {pct(rx.aiApprovalRate)}
                  </span>
                </div>
                <div className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-2">
                  Pharmacist approval:{" "}
                  <span className="font-bold text-green-300">
                    {pct(rx.pharmacistApprovalRate)}
                  </span>
                </div>
                <div className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-2">
                  Avg confidence:{" "}
                  <span className="font-bold text-amber-300">
                    {pct(rx.avgConfidenceScore)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={card}>
            <h2 className="mb-4 text-lg font-black text-white">
              User Role Distribution
            </h2>
            {loading ? (
              <div className="h-64 animate-pulse rounded-xl bg-[#121d34]" />
            ) : !users ? (
              <EmptyChart text="No user data available" />
            ) : (
              <div className="h-72">
                <Doughnut
                  data={userRoleData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            )}
            {!loading && users ? (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-2">
                  Active users:{" "}
                  <span className="font-bold text-green-300">
                    {Number(users.activeUsers || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-2">
                  Inactive users:{" "}
                  <span className="font-bold text-slate-200">
                    {Number(users.inactiveUsers || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className={card}>
            <h2 className="mb-4 text-lg font-black text-white">
              Top 10 Medicines
            </h2>
            {loading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-[#121d34]" />
                ))}
              </div>
            ) : topMedicines.length === 0 ? (
              <EmptyChart text="No medicine list data available" />
            ) : (
              <div className="space-y-2">
                {topMedicines.map((medicine, idx) => (
                  <div
                    key={String(medicine.productId || idx)}
                    className="flex items-center justify-between rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {idx + 1}. {medicine.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {medicine.category || "Uncategorized"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-300">
                        {Number(medicine.totalOrdered || 0).toLocaleString(
                          "en-IN",
                        )}{" "}
                        units
                      </p>
                      <p className="text-xs text-green-300">
                        {inr(medicine.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
