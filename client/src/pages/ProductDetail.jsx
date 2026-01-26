import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { fetchProductById, fetchProducts } from "../services/productService";
import { useWishlist } from "../hooks/useWishlist";
import SubstituteModal from "../components/modals/SubstituteModal";
import { ensureAuthenticated } from "../utils/auth";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, items, replaceItem } = useCart();
  const { toggle, isSaved } = useWishlist();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [substituteOptions, setSubstituteOptions] = useState([]);
  const [substituteLoading, setSubstituteLoading] = useState(false);

  const cartItem = useMemo(
    () =>
      items.find(
        (i) =>
          i.productId === id ||
          i.id === id ||
          i.productId === product?._id ||
          i.id === product?._id,
      ),
    [items, id, product],
  );

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const data = await fetchProductById(id);
        setProduct(data);

        if (data?.category) {
          const related = await fetchProducts({
            category: data.category,
            limit: 6,
          });
          setRelatedProducts((related || []).filter((p) => p._id !== data._id));
        } else {
          setRelatedProducts([]);
        }

        setError(null);
      } catch (err) {
        console.error("Error loading product", err);
        setError("Failed to load product details. Please try again.");
        setProduct(null);
        setRelatedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    const loadSubstitutes = async () => {
      if (!product?.composition) {
        setSubstituteOptions([]);
        return;
      }

      const saltKey = product.composition.split(/,|\+/)[0]?.trim();
      if (!saltKey) return;

      try {
        setSubstituteLoading(true);
        const results = await fetchProducts({ search: saltKey, limit: 20 });
        const options = (results || [])
          .filter((p) => {
            if (!p) return false;
            const pid = p._id || p.id;
            if (pid === (product._id || product.id)) return false;
            const matchesSalt = (p.composition || "")
              .toLowerCase()
              .includes(saltKey.toLowerCase());
            const matchesStrength =
              product.strength && p.strength
                ? p.strength.toLowerCase() === product.strength.toLowerCase()
                : true;
            return matchesSalt && matchesStrength;
          })
          .sort((a, b) => Number(a.price || 0) - Number(b.price || 0));

        const cheaper = options.filter(
          (p) =>
            Number(p.price || Infinity) < Number(product.price || Infinity),
        );

        setSubstituteOptions(cheaper.length ? cheaper : options);
      } catch (err) {
        console.error("Error loading substitutes", err);
        setSubstituteOptions([]);
      } finally {
        setSubstituteLoading(false);
      }
    };

    loadSubstitutes();
  }, [product?._id, product?.composition]);

  const normalizeCartProduct = (p) => ({
    id: p?._id || p?.id,
    productId: p?._id || p?.id,
    name: p?.name,
    price: p?.price || 0,
    mrp: p?.mrp || p?.price || 0,
    isRx: p?.requiresRx,
    requiresRx: p?.requiresRx,
    image: p?.images?.[0],
    composition: p?.composition || "",
    strength: p?.strength || "",
    manufacturer: p?.manufacturer || "",
  });

  const primaryImage =
    product?.images?.[0] ||
    `https://via.placeholder.com/600x600/f7f6f4/666666?text=${encodeURIComponent(
      product?.name?.substring(0, 20) || "Medicine",
    )}`;

  const discount =
    product?.mrp && product?.mrp > product?.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  const handleAddToCart = () => {
    if (!product) return;
    if (!ensureAuthenticated(navigate)) return;
    setAdding(true);
    addItem(normalizeCartProduct(product), quantity);
    setTimeout(() => setAdding(false), 800);
  };

  const handleToggleSave = () => {
    if (!product) return;
    if (!ensureAuthenticated(navigate)) return;
    setSaving(true);
    toggle(normalizeCartProduct(product));
    setTimeout(() => setSaving(false), 500);
  };

  const handleOpenSubstitutes = () => {
    setSubstituteOpen(true);
  };

  const handleAddSubstituteToCart = (option) => {
    if (!ensureAuthenticated(navigate)) return;
    addItem(normalizeCartProduct(option), 1);
    setSubstituteOpen(false);
  };

  const handleReplaceWithSubstitute = (option) => {
    if (!ensureAuthenticated(navigate)) return;
    const baseId = product?._id || product?.id;
    const qty = cartItem?.quantity || quantity || 1;
    replaceItem(baseId, normalizeCartProduct(option), qty);
    setSubstituteOpen(false);
  };

  const categorySlug = product.category
    ? product.category.toLowerCase().replace(/\s+/g, "-")
    : "categories";

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primary-text flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-6">
          <div className="animate-pulse grid md:grid-cols-2 gap-10">
            <div className="aspect-square rounded-3xl bg-gray-200" />
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-10 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-12 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background text-primary-text flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <h1 className="text-3xl font-nexus-bold">
            {error ? "Error loading product" : "Product not found"}
          </h1>
          <p className="text-secondary-text">
            {error || "Please go back and browse our catalog."}
          </p>
          <div className="flex justify-center gap-4">
            <button
              className="px-5 py-2 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-lg transition"
              onClick={() => navigate(-1)}
            >
              Go back
            </button>
            <Link
              to="/categories"
              className="px-5 py-2 rounded-full border border-border text-primary-text font-semibold bg-white hover:-translate-y-0.5 hover:shadow-card transition"
            >
              Browse categories
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-secondary-text">
          <Link to="/" className="hover:text-brand-coral">
            Home
          </Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-brand-coral">
            Categories
          </Link>
          <span>/</span>
          <Link
            to={`/categories/${categorySlug}`}
            className="hover:text-brand-coral"
          >
            {product.category || "Medicines"}
          </Link>
          <span>/</span>
          <span className="text-primary-text">{product.name}</span>
        </nav>

        {/* Product Main Section */}
        <section className="grid md:grid-cols-2 gap-10">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl border border-border bg-white shadow-card overflow-hidden">
              <img
                src={primaryImage}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/600x600/f7f6f4/666666?text=${encodeURIComponent(
                    product.name.substring(0, 20),
                  )}`;
                }}
              />
              {product.requiresRx && (
                <span className="absolute left-4 top-4 rounded-full bg-[#0f172a] text-white text-sm px-4 py-2 shadow-lg">
                  Prescription Required
                </span>
              )}
              {discount && (
                <span className="absolute right-4 top-4 rounded-full bg-[#ecfdf3] text-[#15803d] text-sm px-4 py-2 border border-[#bbf7d0] shadow-lg">
                  {discount}% off
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(product.images && product.images.length
                ? product.images
                : [primaryImage]
              )
                .slice(0, 3)
                .map((img, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-2xl border border-border bg-[#f7f6f4] overflow-hidden"
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {product.category && (
                  <span className="px-3 py-1 rounded-full bg-[#f7f6f4] text-secondary-text text-xs border border-border">
                    {product.category}
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs border ${
                    product.requiresRx
                      ? "bg-[#0f172a] text-white border-[#0f172a]"
                      : "bg-[#ecfdf3] text-[#15803d] border-[#bbf7d0]"
                  }`}
                >
                  {product.requiresRx ? "Rx Required" : "OTC"}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#f0f9f4] text-[#15803d] text-xs border border-[#c0ecd0]">
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-nexus-bold leading-tight">
                {product.name}
              </h1>
              <p className="text-lg text-secondary-text">
                {product.manufacturer || "Verified manufacturer"}
              </p>
              <p className="text-sm text-secondary-text">
                {product.composition || "Detailed composition available"}
                {product.packSize ? ` • Pack: ${product.packSize}` : ""}
              </p>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-nexus-bold text-primary-text">
                ₹{product.price}
              </span>
              {product.mrp && product.mrp > product.price && (
                <>
                  <span className="text-xl text-secondary-text line-through">
                    ₹{product.mrp}
                  </span>
                  <span className="text-lg text-[#15803d] font-semibold">
                    {discount}% off
                  </span>
                </>
              )}
            </div>

            <div className="p-4 rounded-2xl border border-border bg-[#f7f6f4] space-y-2">
              <p className="text-sm font-semibold text-primary-text">
                Key Information
              </p>
              <ul className="text-sm text-secondary-text space-y-1">
                <li>
                  • Composition:{" "}
                  <span className="font-semibold">
                    {product.composition || "See description"}
                  </span>
                </li>
                <li>
                  • Pack size:{" "}
                  <span className="font-semibold">
                    {product.packSize || "Standard pack"}
                  </span>
                </li>
                <li>
                  • Manufacturer:{" "}
                  <span className="font-semibold">
                    {product.manufacturer || "Verified partner"}
                  </span>
                </li>
                <li>
                  • Category:{" "}
                  <span className="font-semibold">
                    {product.category || "Medicines"}
                  </span>
                </li>
                <li>
                  • Prescription:{" "}
                  <span className="font-semibold">
                    {product.requiresRx ? "Required" : "Not Required"}
                  </span>
                </li>
                <li>
                  • Availability:{" "}
                  <span className="font-semibold">
                    {product.stock > 0
                      ? `${product.stock} in stock`
                      : "Out of stock"}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  className="w-10 h-10 rounded-full border border-border bg-white text-primary-text font-semibold hover:bg-[#f7f6f4] transition"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="text-lg font-semibold w-8 text-center">
                  {quantity}
                </span>
                <button
                  className="w-10 h-10 rounded-full border border-border bg-white text-primary-text font-semibold hover:bg-[#f7f6f4] transition"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>
              <button
                className="flex-1 px-6 py-3 rounded-full bg-brand-coral text-white font-semibold shadow-soft hover:shadow-card transition"
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding
                  ? "Added"
                  : cartItem
                    ? `In cart (${cartItem.quantity})`
                    : "Add to cart"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className={`px-4 py-2 rounded-full border bg-white text-primary-text font-semibold hover:-translate-y-0.5 hover:shadow-card transition ${
                  isSaved(product._id || product.id)
                    ? "border-brand-coral text-brand-coral"
                    : "border-border"
                }`}
                onClick={handleToggleSave}
              >
                {isSaved(product._id || product.id)
                  ? "💖 Saved"
                  : saving
                    ? "Saving..."
                    : "❤️ Save for later"}
              </button>
              <button
                onClick={handleOpenSubstitutes}
                className="px-4 py-2 rounded-full border border-border bg-white text-primary-text font-semibold hover:-translate-y-0.5 hover:shadow-card transition text-center"
              >
                🔁 Find substitutes
              </button>
            </div>
          </div>
        </section>

        {/* Tabs Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-4 border-b border-border">
            {["overview", "usage", "side-effects", "faqs"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? "text-brand-coral border-b-2 border-brand-coral"
                    : "text-secondary-text hover:text-primary-text"
                }`}
              >
                {tab.replace("-", " ")}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-2xl border border-border bg-white shadow-soft space-y-4">
            {activeTab === "overview" && (
              <div className="space-y-3">
                <h3 className="text-xl font-nexus-bold">Product Overview</h3>
                <p className="text-secondary-text leading-relaxed">
                  {product.name} is a medicine from{" "}
                  {product.manufacturer || "trusted manufacturers"}, containing{" "}
                  {product.composition || "the listed ingredients"}. It is
                  commonly used under the {product.category || "general"}{" "}
                  category and
                  {product.requiresRx
                    ? " requires a valid prescription"
                    : " is available over the counter"}
                  .
                </p>
                <div className="p-4 rounded-xl bg-[#f7f6f4] border border-border">
                  <p className="text-sm font-semibold mb-2">
                    Storage Instructions
                  </p>
                  <p className="text-sm text-secondary-text">
                    Store in a cool, dry place away from sunlight. Keep out of
                    reach of children.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "usage" && (
              <div className="space-y-3">
                <h3 className="text-xl font-nexus-bold">How to Use</h3>
                <ul className="space-y-2 text-secondary-text">
                  <li>
                    • Take as directed by your physician or as per package
                    instructions
                  </li>
                  <li>
                    • Follow the dosing schedule provided with your pack size
                  </li>
                  <li>• Do not exceed the recommended daily dose</li>
                  <li>
                    • Can be taken with or after food to minimize stomach upset
                  </li>
                  <li>• Drink plenty of water with the medication</li>
                </ul>
                <div className="p-4 rounded-xl bg-[#fff4f2] border border-[#ffd4cc]">
                  <p className="text-sm font-semibold mb-1 text-[#e35d39]">
                    ⚠️ Important
                  </p>
                  <p className="text-sm text-secondary-text">
                    Consult a doctor if symptoms persist beyond 3 days or
                    worsen.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "side-effects" && (
              <div className="space-y-3">
                <h3 className="text-xl font-nexus-bold">
                  Possible Side Effects
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-sm mb-2">Common (mild):</p>
                    <ul className="space-y-1 text-sm text-secondary-text">
                      <li>• Nausea or upset stomach</li>
                      <li>• Mild dizziness</li>
                      <li>• Drowsiness</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-2">
                      Rare (serious):
                    </p>
                    <ul className="space-y-1 text-sm text-secondary-text">
                      <li>• Allergic reactions (rash, itching, swelling)</li>
                      <li>• Severe stomach pain</li>
                      <li>• Liver problems (with prolonged use)</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#fff4f2] border border-[#ffd4cc]">
                  <p className="text-sm text-secondary-text">
                    Stop use and seek medical help immediately if you experience
                    severe side effects.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "faqs" && (
              <div className="space-y-3">
                <h3 className="text-xl font-nexus-bold">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      q: "Can I take this with other medicines?",
                      a: "Consult your doctor before combining with other medications, especially other pain relievers.",
                    },
                    {
                      q: "Is it safe during pregnancy?",
                      a: "Consult your healthcare provider before use during pregnancy or breastfeeding.",
                    },
                    {
                      q: "Can children take this?",
                      a: "Use pediatric formulations for children and consult a doctor for dosing guidance.",
                    },
                    {
                      q: "What if I miss a dose?",
                      a: "Take it as soon as you remember, but skip if it's almost time for the next dose. Do not double dose.",
                    },
                  ].map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border bg-[#f7f6f4]"
                    >
                      <p className="font-semibold text-sm mb-2">{faq.q}</p>
                      <p className="text-sm text-secondary-text">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-nexus-bold">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {relatedProducts.map((p) => {
                const pDiscount =
                  p.mrp && p.mrp > p.price
                    ? Math.round(((p.mrp - p.price) / p.mrp) * 100)
                    : null;
                return (
                  <Link
                    key={p._id}
                    to={`/product/${p._id}`}
                    className="group rounded-2xl border border-border bg-white shadow-soft hover:shadow-card transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-[#f7f6f4]">
                      <img
                        src={
                          p.images?.[0] ||
                          `https://via.placeholder.com/400x400/f7f6f4/666666?text=${encodeURIComponent(p.name.substring(0, 20))}`
                        }
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {pDiscount && (
                        <span className="absolute right-2 top-2 rounded-full bg-[#ecfdf3] text-[#15803d] text-xs px-3 py-1 border border-[#bbf7d0]">
                          {pDiscount}% off
                        </span>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col gap-2">
                      <h3 className="text-sm font-nexus-bold text-primary-text leading-snug line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="text-xs text-secondary-text line-clamp-2">
                        {p.composition || p.category}
                      </p>
                      <div className="mt-auto flex items-center gap-2">
                        <span className="text-lg font-nexus-bold text-primary-text">
                          ₹{p.price?.toFixed ? p.price.toFixed(2) : p.price}
                        </span>
                        {p.mrp && p.mrp > p.price && (
                          <span className="text-xs text-secondary-text line-through">
                            ₹{p.mrp?.toFixed ? p.mrp.toFixed(2) : p.mrp}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      {substituteOpen && (
        <SubstituteModal
          baseProduct={product}
          options={substituteOptions}
          loading={substituteLoading}
          onClose={() => setSubstituteOpen(false)}
          onAddToCart={handleAddSubstituteToCart}
          onReplaceInCart={handleReplaceWithSubstitute}
        />
      )}
      <Footer />
    </div>
  );
};

export default ProductDetail;
