import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import OrderTrackingTimeline from "../components/timeline/OrderTrackingTimeline";
import Button from "../components/common/Button";
import { fetchOrders } from "../services/orderService";

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchOrders();
        setOrders(data);
      } catch (_) {
        setOrders([]);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div>
          <h1 className="text-headline font-nexus-bold mb-4">Your Orders</h1>
          <div className="accent-bar-violet w-16"></div>
        </div>
        {orders.length === 0 ? (
          <div className="card-base p-8 text-center">
            <p className="text-ink-soft">No orders yet. Start shopping!</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="card-base p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">Order #{order._id}</p>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                  {order.status}
                </span>
              </div>
              <div className="text-sm text-ink-soft">
                {order.items?.length || 0} item(s) · ₹
                {order.payment?.amount || 0}
              </div>
              {order.prescriptionId && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                    Prescription Attached
                  </span>
                  <a
                    href={`/api/prescriptions/${order.prescriptionId}/download`}
                    className="text-brand text-sm font-semibold"
                  >
                    Download
                  </a>
                </div>
              )}
              <OrderTrackingTimeline currentStep={2} />
            </div>
          ))
        )}
        <div className="flex gap-3 justify-between">
          <Link to="/" className="flex-1">
            <Button variant="cta" className="w-full text-lg py-3">
              Shop Again
            </Button>
          </Link>
          <Link to="/profile" className="flex-1">
            <Button variant="secondary" className="w-full text-lg py-3">
              View Profile
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
