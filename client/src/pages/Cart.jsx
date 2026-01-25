import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";

const Cart = () => {
  const { items, increment, decrement, removeItem, clear, total } = useCart();

  const hasRxItems = useMemo(() => items.some((item) => item.isRx), [items]);

  const savings = useMemo(() => {
    return items.reduce((sum, item) => {
      const mrp = item.mrp || item.price;
      return sum + (mrp - item.price) * item.quantity;
    }, 0);
  }, [items]);

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-nexus-bold">
            Shopping Cart
          </h1>
          <p className="text-secondary-text">
            Review your items and proceed to checkout
          </p>
        </div>

        {items.length === 0 ? (
          <div className="max-w-lg mx-auto text-center space-y-6 py-16">
            <div className="text-7xl">🛒</div>
            <h2 className="text-2xl font-nexus-bold">Your cart is empty</h2>
            <p className="text-secondary-text">
              Start adding medicines to your cart to continue shopping.
            </p>
            <Link
              to="/categories"
              className="inline-block px-8 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition"
            >
              Browse medicines
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {hasRxItems && (
                <div className="p-5 rounded-2xl border border-[#ffd4cc] bg-[#fff4f2] space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📋</span>
                    <div className="flex-1">
                      <p className="font-semibold text-[#e35d39] mb-1">
                        Prescription Required
                      </p>
                      <p className="text-sm text-secondary-text">
                        Your cart contains prescription medicines. Please upload
                        a valid prescription before checkout.
                      </p>
                      <Link
                        to="/ai-prescription"
                        className="inline-block mt-3 text-sm font-semibold text-[#e35d39] hover:underline"
                      >
                        Upload prescription →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-border bg-white shadow-soft hover:shadow-card transition-all duration-300 flex flex-col md:flex-row gap-4"
                  >
                    <div className="w-full md:w-24 h-24 rounded-xl bg-[#f7f6f4] border border-border overflow-hidden flex-shrink-0">
                      <img
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200"
                        }
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Link
                            to={`/product/${item.id}`}
                            className="font-nexus-bold text-lg hover:text-brand-coral transition"
                          >
                            {item.name}
                          </Link>
                          {item.isRx && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#0f172a] text-white text-xs">
                              Rx
                            </span>
                          )}
                          <p className="text-sm text-secondary-text mt-1">
                            {item.composition || item.strength}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-secondary-text hover:text-red-500 transition"
                          title="Remove item"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => decrement(item.id)}
                            className="w-8 h-8 rounded-full border border-border bg-white text-primary-text font-semibold hover:bg-[#f7f6f4] transition"
                          >
                            −
                          </button>
                          <span className="text-lg font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increment(item.id)}
                            className="w-8 h-8 rounded-full border border-border bg-white text-primary-text font-semibold hover:bg-[#f7f6f4] transition"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-xl font-nexus-bold text-primary-text">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={clear}
                className="text-sm text-secondary-text hover:text-red-500 font-semibold transition"
              >
                Clear cart
              </button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 rounded-2xl border border-border bg-white shadow-card space-y-5">
                <h2 className="text-xl font-nexus-bold">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-text">
                      Subtotal ({items.length}{" "}
                      {items.length === 1 ? "item" : "items"})
                    </span>
                    <span className="font-semibold">₹{total.toFixed(2)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex items-center justify-between text-[#15803d]">
                      <span>Total savings</span>
                      <span className="font-semibold">
                        −₹{savings.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-text">Delivery</span>
                    <span className="font-semibold text-[#15803d]">FREE</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-nexus-bold text-primary-text">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Link to="/checkout" className="block">
                  <button className="w-full px-6 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition">
                    Proceed to checkout
                  </button>
                </Link>

                <Link to="/categories" className="block">
                  <button className="w-full px-6 py-3 rounded-full border border-border bg-white text-primary-text font-semibold hover:-translate-y-0.5 hover:shadow-card transition">
                    Continue shopping
                  </button>
                </Link>

                {hasRxItems && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-secondary-text">
                      💊 This order contains prescription medicines. Valid
                      prescription required before delivery.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
