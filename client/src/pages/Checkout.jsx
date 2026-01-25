import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { createOrder } from "../services/orderService";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clear } = useCart();

  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Review
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "upi",
  });

  const hasRxItems = useMemo(() => items.some((item) => item.isRx), [items]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitAddress = (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.phone ||
      !formData.address ||
      !formData.city ||
      !formData.pincode
    ) {
      setError("Please fill all required fields");
      return;
    }
    setError("");
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    setError("");
    setSubmitting(true);
    try {
      await createOrder({
        items: items.map((i) => ({
          product: i.id,
          quantity: i.quantity,
          price: i.price,
        })),
        address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        payment: { method: formData.paymentMethod, amount: total },
      });
      clear();
      navigate("/orders", { state: { orderPlaced: true } });
    } catch (err) {
      setError("Order placement failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-primary-text flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <h1 className="text-3xl font-nexus-bold">Your cart is empty</h1>
          <p className="text-secondary-text">
            Add items to your cart before checking out.
          </p>
          <Link
            to="/categories"
            className="inline-block px-8 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition"
          >
            Browse medicines
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-nexus-bold">Checkout</h1>
          <div className="flex items-center gap-3 text-sm">
            {[
              { num: 1, label: "Address" },
              { num: 2, label: "Payment" },
              { num: 3, label: "Review" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step >= s.num
                      ? "bg-brand-coral text-white"
                      : "bg-[#f7f6f4] text-secondary-text"
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={
                    step >= s.num ? "font-semibold" : "text-secondary-text"
                  }
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#ffd4cc] bg-[#fff4f2] text-[#e35d39]">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <form
                onSubmit={handleSubmitAddress}
                className="p-6 rounded-2xl border border-border bg-white shadow-card space-y-5"
              >
                <h2 className="text-xl font-nexus-bold">Delivery Address</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 outline-none transition"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 outline-none transition resize-none"
                    required
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 outline-none transition"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition"
                >
                  Continue to payment
                </button>
              </form>
            )}

            {step === 2 && (
              <div className="p-6 rounded-2xl border border-border bg-white shadow-card space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-nexus-bold">Payment Method</h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-brand-coral font-semibold hover:underline"
                  >
                    Edit address
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[#f7f6f4] border border-border text-sm">
                  <p className="font-semibold mb-1">{formData.name}</p>
                  <p className="text-secondary-text">{formData.address}</p>
                  <p className="text-secondary-text">
                    {formData.city}, {formData.state} - {formData.pincode}
                  </p>
                  <p className="text-secondary-text mt-1">{formData.phone}</p>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      id: "upi",
                      label: "UPI (Google Pay, PhonePe, Paytm)",
                      icon: "📱",
                    },
                    { id: "card", label: "Credit / Debit Card", icon: "💳" },
                    { id: "netbanking", label: "Net Banking", icon: "🏦" },
                    { id: "cod", label: "Cash on Delivery", icon: "💵" },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                        formData.paymentMethod === method.id
                          ? "border-brand-coral bg-[#fff4f2]"
                          : "border-border bg-white hover:border-brand-coral/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={formData.paymentMethod === method.id}
                        onChange={handleChange}
                        className="w-5 h-5 text-brand-coral"
                      />
                      <span className="text-2xl">{method.icon}</span>
                      <span className="flex-1 font-semibold">
                        {method.label}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="w-full px-6 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition"
                >
                  Review order
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="p-6 rounded-2xl border border-border bg-white shadow-card space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-nexus-bold">Review Order</h2>
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-brand-coral font-semibold hover:underline"
                  >
                    Edit payment
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-secondary-text mb-2">
                      Delivery Address
                    </p>
                    <div className="p-4 rounded-xl bg-[#f7f6f4] border border-border text-sm">
                      <p className="font-semibold">{formData.name}</p>
                      <p className="text-secondary-text">
                        {formData.address}, {formData.city}, {formData.state} -{" "}
                        {formData.pincode}
                      </p>
                      <p className="text-secondary-text">{formData.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary-text mb-2">
                      Payment Method
                    </p>
                    <div className="p-4 rounded-xl bg-[#f7f6f4] border border-border text-sm">
                      <p className="font-semibold capitalize">
                        {formData.paymentMethod.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary-text mb-2">
                      Items ({items.length})
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#f7f6f4] border border-border"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-secondary-text">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Placing order..."
                    : `Place order • ₹${total.toFixed(2)}`}
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-2xl border border-border bg-white shadow-card space-y-4">
              <h2 className="text-xl font-nexus-bold">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-text">
                    Subtotal ({items.length} items)
                  </span>
                  <span className="font-semibold">₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-text">Delivery</span>
                  <span className="font-semibold text-[#15803d]">FREE</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-nexus-bold text-primary-text">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
              {hasRxItems && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-secondary-text">
                    💊 This order contains prescription medicines. Please upload
                    prescription before delivery.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
