import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/common/Button";

const Wishlist = () => (
  <div className="min-h-screen bg-page">
    <Navbar />
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <div>
        <h1 className="text-headline font-nexus-bold mb-4">Wishlist</h1>
        <div className="accent-bar-violet w-16"></div>
      </div>
      <div className="card-base p-8 text-center space-y-4">
        <p className="text-ink-soft text-lg font-roserri">
          Saved products will appear here.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/categories">
            <Button variant="secondary">Browse Categories</Button>
          </Link>
          <Link to="/">
            <Button variant="cta">Shop Now</Button>
          </Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Wishlist;
