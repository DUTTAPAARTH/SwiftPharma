import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../services/apiClient";

const PRODUCT_FORM_INITIAL = {
  name: "",
  composition: "",
  category: "",
  manufacturer: "",
  packSize: "",
  mrp: "",
  price: "",
  stock: "0",
  strength: "",
  dosageForm: "tablet",
  requiresRx: false,
  description: "",
};

const DOSAGE_OPTIONS = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "ointment",
  "drop",
  "powder",
];

const showToast = (message, type = "success") => {
  const existing = document.getElementById("admin-products-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "admin-products-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "9999",
    padding: "12px 16px",
    borderRadius: "12px",
    background: type === "success" ? "#052e16" : "#450a0a",
    color: type === "success" ? "#6ee7b7" : "#fca5a5",
    border: `1px solid ${type === "success" ? "#10b981" : "#ef4444"}`,
    fontWeight: "700",
    fontSize: "13px",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const pillFallback =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230d1424'/%3E%3Cpath d='M49 28 31 52M34 24c-5.5 0-10 4.5-10 10 0 2.7 1.1 5.2 2.9 7l12.1 12.1c1.8 1.8 4.3 2.9 7 2.9 5.5 0 10-4.5 10-10 0-2.7-1.1-5.2-2.9-7L41 26.9c-1.8-1.8-4.3-2.9-7-2.9z' fill='none' stroke='%2300bcd4' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";

const ProductFormModal = ({
  open,
  categories,
  editingProduct,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState(PRODUCT_FORM_INITIAL);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!editingProduct) {
      setForm(PRODUCT_FORM_INITIAL);
      setImageFile(null);
      setPreviewUrl("");
      setErrors({});
      return;
    }

    setForm({
      name: editingProduct.name || "",
      composition: editingProduct.composition || "",
      category: editingProduct.category?._id || editingProduct.category || "",
      manufacturer: editingProduct.manufacturer || "",
      packSize: editingProduct.packSize || "",
      mrp: editingProduct.mrp || "",
      price: editingProduct.price || "",
      stock: String(editingProduct.stock ?? 0),
      strength: editingProduct.strength || "",
      dosageForm: editingProduct.dosageForm || "tablet",
      requiresRx: Boolean(
        editingProduct.isRx || editingProduct.prescriptionRequired,
      ),
      description: editingProduct.description || "",
    });
    setPreviewUrl(editingProduct.image || editingProduct.images?.[0] || "");
    setImageFile(null);
    setErrors({});
  }, [open, editingProduct]);

  const discountPercent = useMemo(() => {
    const mrp = Number(form.mrp || 0);
    const price = Number(form.price || 0);
    if (!(mrp > 0) || !(price > 0) || price > mrp) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }, [form.mrp, form.price]);

  if (!open) return null;

  const validate = () => {
    const nextErrors = {};
    const mrp = Number(form.mrp || 0);
    const price = Number(form.price || 0);

    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.composition.trim())
      nextErrors.composition = "Composition is required";
    if (!form.category) nextErrors.category = "Category is required";
    if (!(price > 0)) nextErrors.price = "Price must be greater than 0";
    if (mrp > 0 && price > mrp)
      nextErrors.price = "Price must be less than or equal to MRP";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pickImage = (file) => {
    if (!file) return;
    setImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl("");
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(
          key,
          typeof value === "boolean" ? String(value) : value,
        );
      });
      if (imageFile) formData.append("image", imageFile);

      if (editingProduct?._id) {
        await apiClient.patch(
          `/admin/products/${editingProduct._id}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        showToast("Product updated");
      } else {
        await apiClient.post("/admin/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("Product created");
      }
      onSaved();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Unable to save product",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/70"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-6 h-[calc(100%-3rem)] w-[min(1100px,95vw)] overflow-y-auto rounded-2xl border border-[#1a2540] bg-[#0a0f1e] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#1a2540] bg-[#0d1424] p-2 text-slate-300 hover:text-white"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
              Basic Info
            </h3>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">
                  Product Name *
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                />
                {errors.name ? (
                  <p className="mt-1 text-xs text-red-300">{errors.name}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">
                  Generic / Composition *
                </span>
                <input
                  value={form.composition}
                  onChange={(e) => setField("composition", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                />
                {errors.composition ? (
                  <p className="mt-1 text-xs text-red-300">
                    {errors.composition}
                  </p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">
                  Category *
                </span>
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <p className="mt-1 text-xs text-red-300">{errors.category}</p>
                ) : null}
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">
                    Manufacturer
                  </span>
                  <input
                    value={form.manufacturer}
                    onChange={(e) => setField("manufacturer", e.target.value)}
                    className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">
                    Pack Size
                  </span>
                  <input
                    value={form.packSize}
                    onChange={(e) => setField("packSize", e.target.value)}
                    placeholder="Strip of 10"
                    className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
              Pricing
            </h3>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">
                    MRP
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.mrp}
                    onChange={(e) => setField("mrp", e.target.value)}
                    className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">
                    Selling Price *
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                  {errors.price ? (
                    <p className="mt-1 text-xs text-red-300">{errors.price}</p>
                  ) : null}
                </label>
              </div>
              <div className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-slate-300">
                Discount:{" "}
                <span className="font-black text-green-300">
                  {discountPercent}%
                </span>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">
                  Stock Quantity
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
              Medical Details
            </h3>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">
                    Strength
                  </span>
                  <input
                    value={form.strength}
                    onChange={(e) => setField("strength", e.target.value)}
                    placeholder="500mg"
                    className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">
                    Dosage Form
                  </span>
                  <select
                    value={form.dosageForm}
                    onChange={(e) => setField("dosageForm", e.target.value)}
                    className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                  >
                    {DOSAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2">
                <span className="text-sm font-semibold text-slate-200">
                  Requires Prescription
                </span>
                <button
                  type="button"
                  onClick={() => setField("requiresRx", !form.requiresRx)}
                  className={`h-7 w-14 rounded-full p-1 transition ${form.requiresRx ? "bg-red-500/30" : "bg-slate-600/40"}`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition ${form.requiresRx ? "translate-x-7" : "translate-x-0"}`}
                  />
                </button>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-300">
              Image
            </h3>
            <div className="mt-3 rounded-xl border border-dashed border-[#2a3552] bg-[#0a0f1e] p-4 text-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto h-40 w-40 rounded-xl object-cover"
                />
              ) : (
                <div className="mx-auto grid h-40 w-40 place-items-center rounded-xl border border-[#1a2540] bg-[#10192f]">
                  <span className="material-symbols-outlined text-5xl text-slate-500">
                    pill
                  </span>
                </div>
              )}

              <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => pickImage(event.target.files?.[0])}
                />
              </label>

              {previewUrl ? (
                <button
                  type="button"
                  onClick={removeImage}
                  className="mt-3 block w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
                >
                  Remove image
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#1a2540] bg-[#0d1424] px-5 py-2.5 text-sm font-bold text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-[#001317] hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingProduct
                ? "Update Product"
                : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StockModal = ({ open, product, onClose, onSaved }) => {
  const [stock, setStock] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStock(Number(product?.stock || 0));
    const esc = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, product, onClose]);

  if (!open || !product) return null;

  const submit = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/admin/products/${product._id}/stock`, {
        stock: Number(stock),
      });
      showToast("Stock updated");
      onSaved();
    } catch {
      showToast("Unable to update stock", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white">Update Stock</h3>
        <p className="mt-1 text-sm text-slate-400">{product.name}</p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-400">
            New stock value
          </span>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-[#001317] disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ open, product, onClose, onConfirm, loading }) => {
  useEffect(() => {
    if (!open) return;
    const esc = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open || !product) return null;

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white">Remove Product</h3>
        <p className="mt-2 text-sm text-slate-300">
          Are you sure you want to remove{" "}
          <span className="font-bold text-white">{product.name}</span> from the
          catalog?
        </p>
        <p className="mt-1 text-sm text-slate-400">
          This will hide it from customers but not delete the data.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(product)}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? "Removing..." : "Remove Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TableSkeleton = () => (
  <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-4">
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[#121d34]" />
      ))}
    </div>
  </div>
);

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/admin/products", {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          category: categoryFilter || undefined,
        },
      });
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setTotal(Number(data?.total || 0));
      setPages(Math.max(1, Number(data?.pages || 1)));
    } catch {
      setProducts([]);
      setTotal(0);
      setPages(1);
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (searchParams.get("openAdd") === "1") {
      setEditingProduct(null);
      setOpenForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete("openAdd");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const toggleActive = async (product) => {
    try {
      await apiClient.patch(`/admin/products/${product._id}`, {
        isActive: !product.isActive,
      });
      showToast(product.isActive ? "Product disabled" : "Product activated");
      await loadProducts();
    } catch {
      showToast("Unable to update product status", "error");
    }
  };

  const confirmDelete = async (product) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/products/${product._id}`);
      showToast("Product removed from catalog");
      setDeleteProduct(null);
      await loadProducts();
    } catch {
      showToast("Unable to remove product", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">
                Product Catalog
              </h1>
              <p className="mt-1 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                {total} products
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Search product name"
                className="w-[280px] rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/60"
              />

              <select
                value={categoryFilter}
                onChange={(event) => {
                  setPage(1);
                  setCategoryFilter(event.target.value);
                }}
                className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-3 py-2.5 text-sm text-slate-100 outline-none"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-200"
              >
                Search
              </button>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setOpenForm(true);
                }}
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-[#001317] hover:bg-cyan-400"
              >
                Add New Product
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <TableSkeleton />
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-500">
              inventory_2
            </span>
            <p className="mt-3 text-lg font-bold text-white">
              No products found
            </p>
            <p className="text-sm text-slate-400">
              Create your first product or adjust filters.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#1a2540] bg-[#0d1424]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#101a2f] text-xs uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Image</th>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-left">Rx</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const mrp = Number(product.mrp || 0);
                    const price = Number(product.price || 0);
                    const discount =
                      mrp > 0 && price <= mrp
                        ? Math.round(((mrp - price) / mrp) * 100)
                        : 0;
                    const stock = Number(product.stock || 0);
                    return (
                      <tr
                        key={product._id}
                        className="border-t border-[#1a2540] text-slate-200"
                      >
                        <td className="px-4 py-3">
                          <img
                            src={
                              product.image ||
                              product.images?.[0] ||
                              pillFallback
                            }
                            alt={product.name}
                            className="h-10 w-10 rounded-lg border border-[#1a2540] object-cover"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {product.composition || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-200">
                            {product.category?.name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-cyan-300">
                            {currency(price)}
                          </p>
                          <p className="text-xs text-slate-400">
                            MRP {currency(mrp)}{" "}
                            {discount > 0 ? `(${discount}% off)` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${stock > 10 ? "border-green-500/30 bg-green-500/15 text-green-300" : stock > 0 ? "border-amber-500/30 bg-amber-500/15 text-amber-300" : "border-red-500/40 bg-red-500/20 text-red-300"}`}
                          >
                            {stock}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {product.isRx || product.prescriptionRequired ? (
                            <span className="inline-flex rounded-full border border-red-400/30 bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-300">
                              Rx
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(product)}
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${product.isActive !== false ? "border-green-500/30 bg-green-500/15 text-green-300" : "border-slate-500/30 bg-slate-500/15 text-slate-300"}`}
                          >
                            {product.isActive !== false ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setOpenForm(true);
                              }}
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-1.5 text-slate-300 hover:text-cyan-300"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => setStockProduct(product)}
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-1.5 text-slate-300 hover:text-amber-300"
                              title="Update Stock"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                inventory_2
                              </span>
                            </button>
                            <button
                              onClick={() => setDeleteProduct(product)}
                              className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] p-1.5 text-slate-300 hover:text-red-300"
                              title="Remove Product"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#1a2540] px-4 py-3">
              <p className="text-xs text-slate-400">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="rounded-lg border border-[#1a2540] bg-[#0a0f1e] px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        <ProductFormModal
          open={openForm}
          categories={categories}
          editingProduct={editingProduct}
          onClose={() => setOpenForm(false)}
          onSaved={async () => {
            setOpenForm(false);
            setEditingProduct(null);
            await loadProducts();
          }}
        />

        <StockModal
          open={Boolean(stockProduct)}
          product={stockProduct}
          onClose={() => setStockProduct(null)}
          onSaved={async () => {
            setStockProduct(null);
            await loadProducts();
          }}
        />

        <DeleteConfirmModal
          open={Boolean(deleteProduct)}
          product={deleteProduct}
          loading={deleting}
          onClose={() => setDeleteProduct(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
