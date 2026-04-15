import { useEffect, useMemo, useState } from "react";
import Button from "../../components/common/Button";
import apiClient from "../../services/apiClient";
import { addVaultItem, updateVaultItem } from "../../services/vaultService";

const unitOptions = ["tablets", "capsules", "ml", "strips", "sachets", "units"];
const criticalOptions = ["low", "medium", "high"];

const todayIso = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  productId: null,
  productName: "",
  quantity: 1,
  unit: "units",
  expiryDate: "",
  criticalLevel: "medium",
  notes: "",
};

const toEditForm = (item = {}) => ({
  productId: item.productId || null,
  productName: item.productName || "",
  quantity: Number(item.quantity || 0),
  unit: item.unit || "units",
  expiryDate: item.expiryDate
    ? new Date(item.expiryDate).toISOString().slice(0, 10)
    : "",
  criticalLevel: item.criticalLevel || "medium",
  notes: item.notes || "",
});

const VaultItemModal = ({
  open,
  mode = "add",
  initialData,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialData) {
      const mapped = toEditForm(initialData);
      setForm(mapped);
      setQuery(mapped.productName || "");
      return;
    }

    setForm({
      ...initialForm,
      productName: initialData?.productName || "",
      criticalLevel: initialData?.criticalLevel || "medium",
      productId: initialData?.productId || null,
    });
    setQuery(initialData?.productName || "");
  }, [open, isEdit, initialData]);

  useEffect(() => {
    if (!open || isEdit) return;
    const q = String(query || "").trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await apiClient.get("/products", {
          params: { q, limit: 8 },
        });
        const result = Array.isArray(data) ? data : [];
        if (!active) return;
        setSuggestions(result);
      } catch {
        if (!active) return;
        setSuggestions([]);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, open, isEdit]);

  const title = useMemo(
    () => (isEdit ? "Edit Vault Item" : "Add to Vault"),
    [isEdit],
  );

  if (!open) return null;

  const submit = async () => {
    setError("");

    const payload = {
      productId: form.productId || null,
      productName: String(form.productName || "").trim(),
      quantity: Number(form.quantity),
      unit: form.unit,
      expiryDate: form.expiryDate,
      criticalLevel: form.criticalLevel,
      notes: String(form.notes || "").trim(),
    };

    if (
      !payload.productName ||
      !payload.expiryDate ||
      !Number.isFinite(payload.quantity) ||
      payload.quantity < 0
    ) {
      setError("Please fill all required fields");
      return;
    }

    if (payload.notes.length > 200) {
      setError("Notes can be maximum 200 characters");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateVaultItem(initialData._id, {
          quantity: payload.quantity,
          unit: payload.unit,
          expiryDate: payload.expiryDate,
          criticalLevel: payload.criticalLevel,
          notes: payload.notes,
        });
      } else {
        await addVaultItem(payload);
      }
      onSaved?.(isEdit ? "Updated vault item" : "Added to vault");
      onClose?.();
    } catch (apiError) {
      setError(
        apiError?.response?.data?.message || "Failed to save vault item",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectSuggestion = (item) => {
    setForm((prev) => ({
      ...prev,
      productId: item?._id || null,
      productName: item?.name || prev.productName,
    }));
    setQuery(item?.name || "");
    setSuggestions([]);
  };

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] border border-border-subtle bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-2xl font-nexus-bold text-ink">{title}</h3>
          <button
            className="rounded-xl border border-border-subtle px-3 py-2 text-sm text-ink-soft"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="relative">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
              Medicine name *
            </label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setForm((prev) => ({
                  ...prev,
                  productName: e.target.value,
                  productId: null,
                }));
              }}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink"
              placeholder="Start typing medicine name"
            />
            {!isEdit && suggestions.length ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border-subtle bg-white shadow-soft">
                {suggestions.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-background-light"
                    onClick={() => selectSuggestion(item)}
                  >
                    <span className="text-sm font-semibold text-ink">
                      {item.name}
                    </span>
                    <span className="text-xs text-ink-soft">₹{item.price}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
                Quantity *
              </label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    quantity: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
                Unit *
              </label>
              <select
                value={form.unit}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, unit: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
                Expiry date *
              </label>
              <input
                type="date"
                min={todayIso()}
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, expiryDate: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
              Critical level *
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {criticalOptions.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, criticalLevel: level }))
                  }
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                    form.criticalLevel === level
                      ? "border-primary bg-primary text-white"
                      : "border-border-subtle bg-white text-ink-soft"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
              Notes
            </label>
            <textarea
              value={form.notes}
              maxLength={200}
              rows={3}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink"
              placeholder="Optional notes"
            />
          </div>

          {error ? (
            <p className="text-sm font-semibold text-danger">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultItemModal;
