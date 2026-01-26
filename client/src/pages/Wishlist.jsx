import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/common/Button";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import { ensureAuthenticated } from "../utils/auth";

const Wishlist = () => {
  const { items, remove, toggle } = useWishlist();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (item) => {
    if (!ensureAuthenticated(navigate)) return;
    addItem({
      id: item.productId || item.id,
      productId: item.productId || item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      composition: item.composition,
      manufacturer: item.manufacturer,
    });
    toggle(item);
  };

  const handleView = (item) => {
    const productId = item.productId || item.id;
    if (productId) navigate(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div>
          <h1 className="text-headline font-nexus-bold mb-4">Wishlist</h1>
          <div className="accent-bar-violet w-16"></div>
        </div>

        {items.length === 0 ? (
          <div className="card-base p-8 text-center space-y-4">
            <p className="text-ink-soft text-lg font-roserri">
              Saved products will appear here.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/categories">
                <Button variant="secondary">Browse Categories</Button>
              </Link>
              <Link to="/home">
                <Button variant="cta">Shop Now</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.productId || item.id}
                className="card-base p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#f7f6f4] border border-border overflow-hidden flex-shrink-0">
                    <img
                      src={
                        item.image ||
                        "https://via.placeholder.com/80x80/f7f6f4/666666?text=Rx"
                      }
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <button
                      onClick={() => handleView(item)}
                      className="text-lg font-semibold text-primary-text hover:text-brand-coral transition"
                    >
                      {item.name}
                    </button>
                    <p className="text-sm text-secondary-text">
                      {item.composition || "See details"}
                    </p>
                    <p className="text-sm font-semibold text-primary-text">
                      ₹{Number(item.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => toggle(item)}>
                    Remove
                  </Button>
                  <Button variant="cta" onClick={() => handleAddToCart(item)}>
                    Add to Cart
                  </Button>
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

export default Wishlist;
