import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminStatCard from "../components/cards/AdminStatCard";
import Button from "../components/common/Button";
import apiClient from "../services/apiClient";

const AdminDashboard = () => {
  const [pendingRx, setPendingRx] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get("/admin/dashboard");
        setPendingRx(data?.stats?.pendingPrescriptions || 0);
      } catch (_) {
        setPendingRx(0);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-cloudWhite flex">
      <AdminSidebar />
      <main className="flex-1 p-8 space-y-6">
        <div>
          <h1 className="text-headline mb-2">Admin Dashboard</h1>
          <div className="accent-bar w-16"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminStatCard label="Total Users" value="-" />
          <AdminStatCard label="Orders" value="-" />
          <AdminStatCard label="Pending Rx" value={pendingRx} />
          <AdminStatCard label="Revenue" value="₹-" />
        </div>
        <div className="flex gap-3 mt-8">
          <Link to="/admin/products">
            <Button variant="cta">Manage Products</Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="primary">View Orders</Button>
          </Link>
          <Link to="/">
            <Button variant="primary">Back to Store</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
