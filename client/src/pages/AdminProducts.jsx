import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import ProductForm from "../components/admin/ProductForm";
import Button from "../components/common/Button";
import { fetchProducts } from "../services/productService";

const normalizeImage = (value) => {
  if (!value) {
    return "https://via.placeholder.com/200x200/0a0f1e/00bcd4?text=%F0%9F%92%8A";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return value.startsWith("/") ? value : `/${value}`;
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleProducts = useMemo(() => products.slice(0, 20), [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts({ limit: 40 });
      setProducts(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch products", err);
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-cloudWhite flex">
      <AdminSidebar />
      <main className="flex-1 p-8 space-y-6">
        <div>
          <h1 className="text-headline mb-2">Products</h1>
          <div className="accent-bar w-16"></div>
        </div>
        <div className="card-base p-8">
          <ProductForm
            onCreated={(created) => {
              setProducts((prev) => [created, ...prev]);
            }}
          />
        </div>

        <section className="card-base p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">Recent Products</h2>
            <button
              type="button"
              onClick={loadProducts}
              className="px-3 py-1.5 rounded border border-tealLight text-sm hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-slate-500">Loading products...</p>
          ) : null}
          {error ? <p className="text-red-600">{error}</p> : null}

          {!loading && !error ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-4">Image</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Category</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Rx</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => {
                    const image = normalizeImage(
                      product.image || product.images?.[0],
                    );
                    return (
                      <tr
                        key={product._id || product.id}
                        className="border-b border-slate-100"
                      >
                        <td className="py-3 pr-4">
                          <img
                            src={image}
                            alt={product.name}
                            className="h-12 w-12 rounded-md object-cover border border-slate-200"
                            onError={(event) => {
                              event.currentTarget.src =
                                "https://via.placeholder.com/200x200/0a0f1e/00bcd4?text=%F0%9F%92%8A";
                            }}
                          />
                        </td>
                        <td className="py-3 pr-4 font-medium text-ink">
                          {product.name}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {typeof product.category === "object"
                            ? product.category?.name || "-"
                            : product.category || "-"}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          ₹{product.price}
                        </td>
                        <td className="py-3 pr-4 text-slate-700">
                          {product.requiresRx ||
                          product.prescriptionRequired ||
                          product.isRx
                            ? "Yes"
                            : "No"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <div className="flex gap-3">
          <Link to="/admin">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
          <Link to="/">
            <Button variant="cta">View Store</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminProducts;
