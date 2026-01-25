import React from "react";
import { Link } from "react-router-dom";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/analytics", label: "Analytics" },
];

const AdminSidebar = () => (
  <aside className="bg-gradient-deep-shadow text-brown w-64 p-6 space-y-2 min-h-screen shadow-lifted sticky top-0">
    <div className="mb-8">
      <h3 className="text-xl font-nexus-bold text-brand mb-2">SwiftPharma</h3>
      <p className="text-sm text-brown/70">Admin Panel</p>
    </div>
    <nav className="space-y-2">
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className="block px-4 py-3 rounded-xl text-brown hover:bg-brand/20 hover:text-brand transition-all duration-200 font-medium"
        >
          {link.label}
        </Link>
      ))}
    </nav>
    <div className="mt-8 pt-6 border-t border-brown/10">
      <Link
        to="/"
        className="block px-4 py-3 rounded-xl text-brown hover:bg-brown/10 transition-all duration-200 text-sm font-medium hover:text-brand"
      >
        ← Back to Store
      </Link>
    </div>
  </aside>
);

export default AdminSidebar;
