import React, { useEffect, useState } from "react";
import { createProduct, fetchCategories } from "../../services/productService";

const initialState = {
  name: "",
  price: "",
  category: "",
  composition: "",
  manufacturer: "",
  packSize: "",
  requiresRx: false,
};

const ProductForm = ({ onCreated }) => {
  const [form, setForm] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [imageFile]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("price", form.price);
      payload.append("category", form.category);
      payload.append("composition", form.composition);
      payload.append("manufacturer", form.manufacturer);
      payload.append("packSize", form.packSize);
      payload.append("requiresRx", String(form.requiresRx));
      if (imageFile) {
        payload.append("image", imageFile);
      }

      const created = await createProduct(payload);
      setMessage("Product saved successfully.");
      setForm(initialState);
      setImageFile(null);
      event.target.reset();
      if (onCreated) {
        onCreated(created);
      }
    } catch (err) {
      console.error("Failed to create product", err);
      setError(err.response?.data?.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-lg shadow border border-tealLight"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full border border-tealLight rounded px-3 py-2"
          placeholder="Product Name"
          required
        />
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          className="w-full border border-tealLight rounded px-3 py-2"
          placeholder="Price"
          required
        />
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full border border-tealLight rounded px-3 py-2"
          required
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          name="manufacturer"
          value={form.manufacturer}
          onChange={handleChange}
          className="w-full border border-tealLight rounded px-3 py-2"
          placeholder="Manufacturer"
        />
        <input
          name="composition"
          value={form.composition}
          onChange={handleChange}
          className="w-full border border-tealLight rounded px-3 py-2"
          placeholder="Composition"
        />
        <input
          name="packSize"
          value={form.packSize}
          onChange={handleChange}
          className="w-full border border-tealLight rounded px-3 py-2"
          placeholder="Pack Size"
        />
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-ink">
        <input
          name="requiresRx"
          type="checkbox"
          checked={form.requiresRx}
          onChange={handleChange}
        />
        Prescription required
      </label>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Product image
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={(event) => setImageFile(event.target.files?.[0] || null)}
          className="w-full border border-dashed border-tealLight rounded px-3 py-2"
        />
        {previewUrl ? (
          <div className="rounded-xl border border-tealLight bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Preview
            </p>
            <img
              src={previewUrl}
              alt="Product preview"
              className="h-36 w-36 rounded-lg object-cover border border-slate-200"
            />
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="text-sm text-green-600 font-semibold">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 font-semibold">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="bg-tealPrimary text-brown px-4 py-2 rounded disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save Product"}
      </button>
    </form>
  );
};

export default ProductForm;
