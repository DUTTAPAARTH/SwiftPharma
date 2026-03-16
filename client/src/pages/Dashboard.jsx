import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const quickActions = [
    {
      title: "Browse medicines",
      description: "Explore categories and products",
      icon: "storefront",
      action: () => navigate("/categories"),
      theme: "bg-blue-500",
    },
    {
      title: "Upload prescription",
      description: "Scan and verify your prescription",
      icon: "upload_file",
      action: () => navigate("/prescriptions"),
      theme: "bg-emerald-500",
    },
    {
      title: "Track orders",
      description: "See order and delivery updates",
      icon: "package_2",
      action: () => navigate("/orders"),
      theme: "bg-purple-500",
    },
    {
      title: "Your cart",
      description: "Review items before checkout",
      icon: "shopping_cart",
      action: () => navigate("/cart"),
      theme: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-32 pb-24 space-y-16">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-[60px] bg-slate-900 p-12 md:p-16 group">
          <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-all duration-700 -rotate-12 group-hover:rotate-0">
            <span className="material-symbols-outlined text-[200px] font-black">
              dashboard
            </span>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">
                <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
                Active Session
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                Welcome, {user?.name || "Practitioner"}
              </h1>
              <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
                Manage prescriptions, orders, and everyday medicine shopping in
                one place.
              </p>
            </div>

            <div className="h-24 w-px bg-slate-800 hidden lg:block"></div>

            <div className="flex items-center gap-6">
              <div className="text-right space-y-1 hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Member ID
                </p>
                <p className="text-white font-black">
                  SP-{user?._id?.slice(-8).toUpperCase() || "ADMIN"}
                </p>
              </div>
              <div className="size-20 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center text-primary text-3xl font-black">
                {user?.name?.[0] || "U"}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group relative overflow-hidden rounded-[48px] bg-white dark:bg-slate-900 p-10 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 text-left flex flex-col gap-10 h-full w-full"
            >
              <div
                className={`size-20 rounded-[28px] ${action.theme} flex items-center justify-center text-white shadow-xl transition-all group-hover:scale-110 group-hover:rotate-6`}
              >
                <span className="material-symbols-outlined text-4xl font-black">
                  {action.icon}
                </span>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {action.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                  {action.description}
                </p>
              </div>
              <div className="mt-auto pt-6 flex items-center justify-between text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Open section
                </span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Service Highlights */}
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              icon: "bolt",
              label: "FAST DELIVERY",
              title: "Delivered quickly",
              desc: "Get medicines delivered to your doorstep in as little as 120 minutes.",
            },
            {
              icon: "psychology_alt",
              label: "SMART SCAN",
              title: "Prescription AI assist",
              desc: "Upload a prescription and let AI extract medicine details before pharmacist review.",
            },
            {
              icon: "verified",
              label: "TRUSTED CARE",
              title: "Verified medicines",
              desc: "Orders are checked by licensed pharmacists and sourced from trusted partners.",
            },
          ].map((feat, i) => (
            <div
              key={i}
              className="bg-slate-50 dark:bg-slate-800/50 p-12 rounded-[56px] border border-slate-100 dark:border-slate-700 flex flex-col gap-6 group hover:bg-white dark:hover:bg-slate-900 transition-all duration-500"
            >
              <div className="size-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl font-black">
                  {feat.icon}
                </span>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {feat.label}
                  </p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    {feat.title}
                  </h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
