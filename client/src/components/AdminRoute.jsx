import React, { useContext, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ADMIN_ROLES = ["admin", "pharmacist"];

const showAccessDeniedToast = () => {
  const existing = document.getElementById("admin-access-toast");
  if (existing) return;

  const toast = document.createElement("div");
  toast.id = "admin-access-toast";
  toast.textContent = "Access denied. Admin only.";
  toast.style.position = "fixed";
  toast.style.top = "20px";
  toast.style.right = "20px";
  toast.style.zIndex = "9999";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "12px";
  toast.style.background = "#0d1424";
  toast.style.color = "#f8fafc";
  toast.style.border = "1px solid #f59e0b";
  toast.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";
  toast.style.fontWeight = "700";
  toast.style.fontSize = "13px";
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2600);
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading, isAuthChecked } =
    useContext(AuthContext);
  const blockedToastShown = useRef(false);

  const hasAdminAccess =
    isAuthenticated &&
    ADMIN_ROLES.includes(String(user?.role || "").toLowerCase());

  useEffect(() => {
    if (
      !loading &&
      isAuthChecked &&
      isAuthenticated &&
      !hasAdminAccess &&
      !blockedToastShown.current
    ) {
      blockedToastShown.current = true;
      showAccessDeniedToast();
    }
  }, [loading, isAuthChecked, isAuthenticated, hasAdminAccess]);

  if (loading || !isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-4 text-slate-200">
          <div className="w-14 h-14 relative">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-900/40"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin"></div>
          </div>
          <p className="text-sm font-semibold tracking-wide">
            Checking secure access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default AdminRoute;
