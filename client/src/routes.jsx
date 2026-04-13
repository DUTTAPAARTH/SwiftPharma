import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderTracking from "./pages/OrderTracking";
import Wishlist from "./pages/Wishlist";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import AIPrescriptionScanner from "./pages/AIPrescriptionScanner";
import PrescriptionStatus from "./pages/PrescriptionStatus";
import AIHealthAssistant from "./pages/AIHealthAssistant";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import MySubscriptions from "./pages/MySubscriptions";
import MedicineReminders from "./pages/MedicineReminders";
import Auth from "./pages/Auth";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPrescriptions from "./pages/admin/AdminPrescriptions";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

import Legal from "./pages/Legal";

const withProtectedBoundary = (element) => (
  <ErrorBoundary>
    <ProtectedRoute element={element} />
  </ErrorBoundary>
);

const withAdminBoundary = (element) => (
  <ErrorBoundary>
    <AdminRoute>{element}</AdminRoute>
  </ErrorBoundary>
);

const RoutesConfig = () => (
  <BrowserRouter>
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Auth />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/signup" element={<Auth mode="signup" />} />

      {/* Root route redirects to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Legal & Support Routes */}
      <Route path="/privacy" element={<Legal />} />
      <Route path="/terms" element={<Legal />} />
      <Route path="/safety" element={<Legal />} />
      <Route path="/help" element={<Legal />} />

      {/* Customer protected routes */}
      <Route path="/dashboard" element={withProtectedBoundary(<Dashboard />)} />
      <Route path="/home" element={withProtectedBoundary(<Home />)} />
      <Route
        path="/categories"
        element={withProtectedBoundary(<Categories />)}
      />
      <Route
        path="/categories/:slug"
        element={withProtectedBoundary(<CategoryDetail />)}
      />
      <Route
        path="/product/:id"
        element={withProtectedBoundary(<ProductDetail />)}
      />
      <Route path="/cart" element={withProtectedBoundary(<Cart />)} />
      <Route path="/checkout" element={withProtectedBoundary(<Checkout />)} />
      <Route path="/orders" element={withProtectedBoundary(<Orders />)} />
      <Route
        path="/orders/:orderId/track"
        element={withProtectedBoundary(<OrderTracking />)}
      />
      <Route
        path="/subscriptions"
        element={withProtectedBoundary(<MySubscriptions />)}
      />
      <Route
        path="/reminders"
        element={withProtectedBoundary(<MedicineReminders />)}
      />
      <Route path="/wishlist" element={withProtectedBoundary(<Wishlist />)} />
      <Route path="/profile" element={withProtectedBoundary(<Profile />)} />
      <Route
        path="/prescriptions"
        element={withProtectedBoundary(<AIPrescriptionScanner />)}
      />
      <Route
        path="/prescriptions/scan"
        element={withProtectedBoundary(<AIPrescriptionScanner />)}
      />
      <Route
        path="/ai-prescription"
        element={withProtectedBoundary(<AIPrescriptionScanner />)}
      />
      <Route
        path="/prescription-status"
        element={withProtectedBoundary(<PrescriptionStatus />)}
      />
      <Route
        path="/ai-assistant"
        element={withProtectedBoundary(<AIHealthAssistant />)}
      />

      {/* Admin protected routes */}
      <Route path="/admin" element={withAdminBoundary(<AdminDashboard />)} />
      <Route
        path="/admin/prescriptions"
        element={withAdminBoundary(<AdminPrescriptions />)}
      />
      <Route
        path="/admin/orders"
        element={withAdminBoundary(<AdminOrders />)}
      />
      <Route
        path="/admin/products"
        element={withAdminBoundary(<AdminProducts />)}
      />
      <Route path="/admin/users" element={withAdminBoundary(<AdminUsers />)} />
      <Route
        path="/admin/analytics"
        element={withAdminBoundary(<AdminAnalytics />)}
      />

      <Route
        path="/delivery"
        element={withProtectedBoundary(<DeliveryDashboard />)}
      />

      {/* Catch-all - redirect to login for security */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default RoutesConfig;
