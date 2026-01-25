import React from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import ProductForm from "../components/admin/ProductForm";
import Button from "../components/common/Button";

const AdminProducts = () => (
  <div className="min-h-screen bg-cloudWhite flex">
    <AdminSidebar />
    <main className="flex-1 p-8 space-y-6">
      <div>
        <h1 className="text-headline mb-2">Products</h1>
        <div className="accent-bar w-16"></div>
      </div>
      <div className="card-base p-8">
        <ProductForm />
      </div>
      <div className="flex gap-3">
        <Link to="/admin">
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
        <Link to="/">
          <Button variant="cta">View Store</Button>
        </Link>
      </div>
    </main>
  </div>
);

export default AdminProducts;
