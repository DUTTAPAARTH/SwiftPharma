import React from "react";
import AdminSidebar from "../components/admin/AdminSidebar";

const AdminAnalytics = () => (
  <div className="min-h-screen bg-mintLight flex">
    <AdminSidebar />
    <main className="flex-1 p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-darkGraphite">Analytics</h1>
      <p className="text-darkGraphite/70">
        Sales, best-sellers, user activity coming soon.
      </p>
    </main>
  </div>
);

export default AdminAnalytics;
