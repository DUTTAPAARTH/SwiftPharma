import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import OrderTrackingTimeline from "../components/timeline/OrderTrackingTimeline";
import { fetchOrders } from "../services/orderService";

const normalizeOrders = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchOrders();
        setOrders(normalizeOrders(data));
      } catch (_) {
        setOrders([]);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 space-y-20">
        {/* Orders Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 pb-16 border-b border-slate-100 dark:border-slate-800 relative">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 backdrop-blur-md">
              <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
              Live order updates
            </div>
            <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Your orders
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
              Track delivery progress, payment status, and prescription-linked
              orders in one place.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/categories">
              <button className="h-16 px-10 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:shadow-primary/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-sm">
                  add_circle
                </span>{" "}
                Shop medicines
              </button>
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="py-40 text-center space-y-12 bg-white dark:bg-slate-900 rounded-[64px] border border-slate-100 dark:border-slate-800 shadow-soft relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="size-40 rounded-[48px] bg-slate-50 dark:bg-slate-800 mx-auto flex items-center justify-center border border-slate-100 dark:border-slate-700/50 shadow-inner group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-8xl text-slate-200 dark:text-slate-700">
                package_2
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                No orders yet
              </h3>
              <p className="text-slate-400 font-black text-lg max-w-md mx-auto leading-relaxed">
                Your order history will appear here once you place your first
                order.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-12">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white dark:bg-slate-900 rounded-[60px] p-12 lg:p-14 border border-slate-100 dark:border-slate-800 shadow-soft flex flex-col lg:flex-row gap-16 group hover:border-primary/30 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-[120px] font-black">
                    inventory_2
                  </span>
                </div>

                <div className="lg:w-1/3 flex flex-col justify-between gap-10">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Order ID
                      </p>
                      <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        #{order._id.slice(-8).toUpperCase()}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Items
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-sm">
                            pill
                          </span>
                          <p className="text-lg font-black text-slate-800 dark:text-white">
                            {order.items?.length || 0} item(s)
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Total paid
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-sm">
                            payments
                          </span>
                          <p className="text-lg font-black text-slate-800 dark:text-white">
                            ₹{order.payment?.amount || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                    <div
                      className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        order.status === "delivered"
                          ? "bg-green-500 text-white"
                          : "bg-primary text-white animate-pulse"
                      }`}
                    >
                      {order.status}
                    </div>
                    {order.prescriptionId && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-amber-500 text-sm font-black">
                          verified_user
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          R<span className="lowercase">x</span> Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:w-2/3 space-y-12 bg-slate-50 dark:bg-slate-800/50 rounded-[56px] p-12 border border-slate-100 dark:border-slate-700/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-900 transition-all duration-500">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Delivery timeline
                    </h4>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Real-time updates
                    </p>
                  </div>

                  <div className="px-6 py-4">
                    <OrderTrackingTimeline
                      currentStep={order.status === "delivered" ? 4 : 2}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button className="h-14 px-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:border-primary transition-all flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">
                        receipt_long
                      </span>{" "}
                      Download invoice
                    </button>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Need help?
                      </span>
                      <Link to={`/categories`}>
                        <button className="size-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center hover:bg-primary transition-all shadow-xl group/btn">
                          <span className="material-symbols-outlined font-black group-hover:rotate-12 transition-transform">
                            headset_mic
                          </span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Orders;
