import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const quickActions = [
    {
      title: "Browse Products",
      description: "Explore our medicine catalog",
      icon: "🏥",
      action: () => navigate("/categories"),
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Upload Prescription",
      description: "AI-powered prescription scanning",
      icon: "📋",
      action: () => navigate("/prescriptions"),
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "My Orders",
      description: "Track your orders",
      icon: "📦",
      action: () => navigate("/orders"),
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Shopping Cart",
      description: "View cart and checkout",
      icon: "🛒",
      action: () => navigate("/cart"),
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12 animate-fadeIn">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.name || "User"}! 👋
          </h1>
          <p className="text-gray-600 text-lg">
            Your one-stop solution for all pharmaceutical needs
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.color} p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95`}
            >
              <div className="relative z-10">
                <div className="text-5xl mb-3">{action.icon}</div>
                <h3 className="text-xl font-bold mb-2">{action.title}</h3>
                <p className="text-white/90 text-sm">{action.description}</p>
              </div>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          ))}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Fast Delivery
            </h3>
            <p className="text-gray-600 text-sm">
              Get medicines delivered to your doorstep within hours
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              AI Prescription Scanner
            </h3>
            <p className="text-gray-600 text-sm">
              Upload prescriptions and we'll identify medicines automatically
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">💊</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Verified Medicines
            </h3>
            <p className="text-gray-600 text-sm">
              100% authentic medicines from licensed pharmacies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
