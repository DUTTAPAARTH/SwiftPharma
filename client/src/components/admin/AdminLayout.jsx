import React, { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { logout as logoutRequest } from "../../services/authService";

const navItems = [
  { label: "Dashboard", icon: "grid_view", path: "/admin" },
  {
    label: "Prescriptions",
    icon: "clinical_notes",
    path: "/admin/prescriptions",
  },
  { label: "Orders", icon: "local_shipping", path: "/admin/orders" },
  { label: "Products", icon: "medication", path: "/admin/products" },
  { label: "Users", icon: "group", path: "/admin/users" },
  { label: "Analytics", icon: "bar_chart", path: "/admin/analytics" },
  { label: "Emergency Ops", icon: "emergency", path: "/admin/emergency" },
];

const formatDateTime = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

const AdminLayout = ({ title, children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const roleText = useMemo(
    () => String(user?.role || "admin").toUpperCase(),
    [user?.role],
  );

  const handleLogout = async () => {
    await logoutRequest();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100">
      <aside className="fixed left-0 top-0 z-40 w-[260px] h-screen bg-[#0d1424] border-r border-[#1a2540] flex flex-col">
        <div className="px-5 py-6 border-b border-[#1a2540]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
              <span className="material-symbols-outlined">local_pharmacy</span>
            </div>
            <div>
              <p className="text-lg font-black text-white tracking-tight">
                SwiftPharma
              </p>
              <p className="text-[11px] uppercase tracking-widest text-cyan-300">
                Admin Panel
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2">
            <p className="text-sm font-semibold text-white">
              {user?.name || "Admin User"}
            </p>
            <span className="inline-flex mt-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] px-2 py-0.5 font-bold tracking-widest">
              {roleText}
            </span>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1 overflow-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
                    : "border border-transparent text-slate-300 hover:bg-[#121d35] hover:text-cyan-200"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[#1a2540]">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed top-0 left-[260px] right-0 z-30 h-[74px] bg-[#0d1424] border-b border-[#1a2540] px-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-xs text-slate-400 font-medium">
              {formatDateTime(now)}
            </p>
          </div>
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold tracking-wide text-cyan-300">
            {user?.name || "Admin"}
          </div>
        </div>
      </header>

      <main className="ml-[260px] pt-[74px] p-6 min-h-screen overflow-auto bg-[#0a0f1e]">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
