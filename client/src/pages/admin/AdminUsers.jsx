import React, { useContext, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../services/apiClient";
import { AuthContext } from "../../context/AuthContext";

const card = "rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const roleClass = (role) => {
  if (role === "admin")
    return "border-green-500/40 bg-green-500/15 text-green-300";
  if (role === "pharmacist")
    return "border-purple-500/40 bg-purple-500/15 text-purple-300";
  return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
};

const toDisplayRole = (role) =>
  role === "customer" ? "user" : String(role || "user");

const SkeletonRows = () => (
  <div className={card}>
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[#121d34]" />
      ))}
    </div>
  </div>
);

const DetailsPanel = ({ open, data, loading, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/60" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-[min(560px,95vw)] overflow-y-auto border-l border-[#1a2540] bg-[#0a0f1e] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-white">User Details</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#1a2540] bg-[#0d1424] px-2 py-1 text-slate-200"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[#121d34]" />
            ))}
          </div>
        ) : !data ? (
          <p className="text-sm text-slate-400">No details available</p>
        ) : (
          <div className="space-y-5">
            <section className="rounded-xl border border-[#1a2540] bg-[#0d1424] p-4 text-sm text-slate-200">
              <p>
                <span className="text-slate-400">Name:</span>{" "}
                {data.user?.name || "-"}
              </p>
              <p>
                <span className="text-slate-400">Email:</span>{" "}
                {data.user?.email || "-"}
              </p>
              <p>
                <span className="text-slate-400">Phone:</span>{" "}
                {data.user?.phone || "-"}
              </p>
              <p>
                <span className="text-slate-400">Role:</span>{" "}
                {toDisplayRole(data.user?.role)}
              </p>
              <p>
                <span className="text-slate-400">Status:</span>{" "}
                {data.user?.suspended ? "Suspended" : "Active"}
              </p>
              <p>
                <span className="text-slate-400">Joined:</span>{" "}
                {data.user?.createdAt
                  ? new Date(data.user.createdAt).toLocaleString("en-IN")
                  : "-"}
              </p>
              <p>
                <span className="text-slate-400">Lifetime spend:</span>{" "}
                {inr(data.totalSpent)}
              </p>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-300">
                Recent Orders
              </h4>
              <div className="space-y-2">
                {Array.isArray(data.orders) && data.orders.length > 0 ? (
                  data.orders.map((order) => (
                    <div
                      key={order._id}
                      className="rounded-xl border border-[#1a2540] bg-[#0d1424] p-3 text-sm text-slate-200"
                    >
                      <p className="font-semibold text-white">
                        #
                        {String(order._id || "")
                          .slice(-8)
                          .toUpperCase()}
                      </p>
                      <p>Status: {order.status || "-"}</p>
                      <p>
                        Created:{" "}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("en-IN")
                          : "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No recent orders.</p>
                )}
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-300">
                Recent Prescriptions
              </h4>
              <div className="space-y-2">
                {Array.isArray(data.prescriptions) &&
                data.prescriptions.length > 0 ? (
                  data.prescriptions.map((rx) => (
                    <div
                      key={rx._id}
                      className="rounded-xl border border-[#1a2540] bg-[#0d1424] p-3 text-sm text-slate-200"
                    >
                      <p className="font-semibold text-white">
                        {rx.status || "pending"}
                      </p>
                      <p>
                        AI confidence:{" "}
                        {Number(rx.aiConfidenceScore || 0).toFixed(1)}%
                      </p>
                      <p>
                        Created:{" "}
                        {rx.createdAt
                          ? new Date(rx.createdAt).toLocaleString("en-IN")
                          : "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    No recent prescriptions.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
};

const AdminUsers = () => {
  const { user: currentUser } = useContext(AuthContext);
  const currentUserId = String(currentUser?.id || currentUser?._id || "");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [updatingId, setUpdatingId] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/admin/users", {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          role: role !== "all" ? role : undefined,
        },
      });
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setPages(Math.max(1, Number(data?.pages || 1)));
    } catch (e) {
      setUsers([]);
      setPages(1);
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search, role]);

  const loadDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/admin/users/${id}`);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateRole = async (target, nextRole) => {
    const targetId = String(target._id || "");
    if (targetId === currentUserId) {
      window.alert("You cannot change your own role.");
      return;
    }

    if (nextRole === "admin") {
      const first = window.confirm(
        `Promote ${target.name || target.email} to admin?`,
      );
      if (!first) return;
      const keyword = window.prompt("Type PROMOTE to confirm admin promotion");
      if (keyword !== "PROMOTE") return;
    }

    setUpdatingId(targetId);
    try {
      await apiClient.patch(`/admin/users/${targetId}/role`, {
        role: nextRole,
      });
      await loadUsers();
      if (selectedId === targetId) await loadDetail(targetId);
    } catch (e) {
      window.alert(e?.response?.data?.message || "Failed to update role");
    } finally {
      setUpdatingId("");
    }
  };

  const updateSuspended = async (target, suspended) => {
    const targetId = String(target._id || "");
    if (targetId === currentUserId) {
      window.alert("You cannot suspend your own account.");
      return;
    }

    const confirm = window.confirm(
      `${suspended ? "Suspend" : "Unsuspend"} ${target.name || target.email}?`,
    );
    if (!confirm) return;

    setUpdatingId(targetId);
    try {
      await apiClient.patch(`/admin/users/${targetId}/suspend`, { suspended });
      await loadUsers();
      if (selectedId === targetId) await loadDetail(targetId);
    } catch (e) {
      window.alert(
        e?.response?.data?.message || "Failed to update account status",
      );
    } finally {
      setUpdatingId("");
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const suspended = users.filter((u) => u.suspended).length;
    const admins = users.filter(
      (u) => toDisplayRole(u.role) === "admin",
    ).length;
    return { total, suspended, admins };
  }, [users]);

  return (
    <AdminLayout title="Users">
      <div className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={card}>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Listed Users
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {stats.total.toLocaleString("en-IN")}
            </p>
          </div>
          <div className={card}>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Suspended
            </p>
            <p className="mt-2 text-3xl font-black text-red-300">
              {stats.suspended.toLocaleString("en-IN")}
            </p>
          </div>
          <div className={card}>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Admins (listed)
            </p>
            <p className="mt-2 text-3xl font-black text-green-300">
              {stats.admins.toLocaleString("en-IN")}
            </p>
          </div>
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setSearch(searchInput.trim());
                }
              }}
              placeholder="Search by name or email"
              className="w-[280px] rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
            />
            <select
              value={role}
              onChange={(e) => {
                setPage(1);
                setRole(e.target.value);
              }}
              className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">All roles</option>
              <option value="customer">Users</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="admin">Admins</option>
            </select>
            <button
              onClick={() => {
                setPage(1);
                setSearch(searchInput.trim());
              }}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200"
            >
              Apply
            </button>
          </div>
        </section>

        {loading ? (
          <SkeletonRows />
        ) : users.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-slate-400">
              No users found for current filters.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#1a2540] bg-[#0d1424]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#101a2f] text-xs uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Orders</th>
                    <th className="px-4 py-3 text-left">Spent</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const self = String(u._id) === currentUserId;
                    const disabled = updatingId === String(u._id);
                    return (
                      <tr
                        key={u._id}
                        className="border-t border-[#1a2540] text-slate-200"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">
                            {u.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {u.email || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${roleClass(toDisplayRole(u.role))}`}
                          >
                            {toDisplayRole(u.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {Number(u.orderCount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-cyan-300">
                          {inr(u.totalSpent)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${u.suspended ? "border-red-500/40 bg-red-500/15 text-red-300" : "border-green-500/40 bg-green-500/15 text-green-300"}`}
                          >
                            {u.suspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => loadDetail(u._id)}
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-2 py-1 text-xs font-bold text-slate-200"
                            >
                              View
                            </button>
                            <select
                              disabled={self || disabled}
                              value={toDisplayRole(u.role)}
                              onChange={(e) => updateRole(u, e.target.value)}
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                              title={
                                self
                                  ? "You cannot change your own role"
                                  : "Change role"
                              }
                            >
                              <option value="user">user</option>
                              <option value="pharmacist">pharmacist</option>
                              <option value="admin">admin</option>
                            </select>
                            <button
                              disabled={self || disabled}
                              onClick={() => updateSuspended(u, !u.suspended)}
                              className={`rounded-lg px-2 py-1 text-xs font-bold ${u.suspended ? "border border-green-500/40 bg-green-500/15 text-green-300" : "border border-red-500/40 bg-red-500/15 text-red-300"} disabled:opacity-50`}
                              title={
                                self
                                  ? "You cannot suspend your own account"
                                  : "Toggle suspension"
                              }
                            >
                              {u.suspended ? "Unsuspend" : "Suspend"}
                            </button>
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

        <DetailsPanel
          open={Boolean(selectedId)}
          loading={detailLoading}
          data={detailData}
          onClose={() => {
            setSelectedId("");
            setDetailData(null);
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
