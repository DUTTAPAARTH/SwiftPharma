import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import AIPrescriptionScanner from "./pages/AIPrescriptionScanner";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminAnalytics from "./pages/AdminAnalytics";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";

const RoutesConfig = () => (
  <BrowserRouter>
    <Routes>
      {/* 🔐 LOGIN GATE - Root redirects to login */}
      <Route path="/login" element={<Auth />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/signup" element={<Auth mode="signup" />} />

      {/* Root route redirects to login - ALWAYS SHOW LOGIN FIRST */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected Routes - ALL require authentication */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute element={<Dashboard />} />}
      />
      <Route path="/home" element={<ProtectedRoute element={<Home />} />} />
      <Route
        path="/categories"
        element={<ProtectedRoute element={<Categories />} />}
      />
      <Route
        path="/categories/:slug"
        element={<ProtectedRoute element={<CategoryDetail />} />}
      />
      <Route
        path="/product/:id"
        element={<ProtectedRoute element={<ProductDetail />} />}
      />
      <Route path="/cart" element={<ProtectedRoute element={<Cart />} />} />
      <Route
        path="/checkout"
        element={<ProtectedRoute element={<Checkout />} />}
      />
      <Route path="/orders" element={<ProtectedRoute element={<Orders />} />} />
      <Route
        path="/wishlist"
        element={<ProtectedRoute element={<Wishlist />} />}
      />
      <Route
        path="/profile"
        element={<ProtectedRoute element={<Profile />} />}
      />
      <Route
        path="/prescriptions"
        element={<ProtectedRoute element={<AIPrescriptionScanner />} />}
      />
      <Route
        path="/prescriptions/scan"
        element={<ProtectedRoute element={<AIPrescriptionScanner />} />}
      />
      <Route
        path="/ai-prescription"
        element={<ProtectedRoute element={<AIPrescriptionScanner />} />}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute element={<AdminDashboard />} />}
      />
      <Route
        path="/admin/products"
        element={<ProtectedRoute element={<AdminProducts />} />}
      />
      <Route
        path="/admin/orders"
        element={<ProtectedRoute element={<AdminOrders />} />}
      />
      <Route
        path="/admin/analytics"
        element={<ProtectedRoute element={<AdminAnalytics />} />}
      />
      <Route
        path="/delivery"
        element={<ProtectedRoute element={<DeliveryDashboard />} />}
      />

      {/* Catch-all - redirect to login for security */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default RoutesConfig;
