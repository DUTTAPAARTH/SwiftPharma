import React, { useCallback, useRef, useState } from "react";
import { useCart } from "../../hooks/useCart";

const skeletonLines = new Array(4).fill(0);

const PrescriptionUpload = ({ onSubmit, onSuccess, loading }) => {
  const { addItem } = useCart();
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [doctorName, setDoctorName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [parsedMedicines, setParsedMedicines] = useState([]);
  const [expiryDate, setExpiryDate] = useState("");
  const [uiError, setUiError] = useState(null);
  const [uiLoading, setUiLoading] = useState(false);
  const inputRef = useRef();

  const handleFiles = useCallback((picked) => {
    const list = Array.from(picked || []);
    if (!list.length) return;
    setFiles(list);
    const first = list[0];
    const url = URL.createObjectURL(first);
    setPreview(url);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    if (!files.length || !onSubmit) {
      setUiError("Please attach a prescription image first.");
      return;
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    if (doctorName) formData.append("doctorName", doctorName);
    if (issueDate) formData.append("issueDate", issueDate);
    if (ocrText) formData.append("ocrText", ocrText);

    setUiError(null);
    setUiLoading(true);
    try {
      const result = await onSubmit(formData);
      const data = result?.data || result || {};

      if (data?.doctorName) {
        setDoctorName(data.doctorName);
      }

      if (data?.issueDate) {
        const dateStr = new Date(data.issueDate).toISOString().slice(0, 10);
        setIssueDate(dateStr);
      }

      if (data?.expiryDate) {
        setExpiryDate(data.expiryDate);
      }

      if (data?.ocrText) {
        setOcrText(data.ocrText);
      }

      const meds =
        data?.medicines ||
        data?.extractedMedicines ||
        data?.extractedData?.medicines ||
        [];

      if (meds.length > 0) {
        setParsedMedicines(meds);
      } else {
        setUiError(
          "⚠️ Prescription uploaded but no medicines detected. Please add manually.",
        );
      }

      onSuccess?.(data);
    } catch (err) {
      setUiError(
        err?.response?.data?.message ||
          "Unable to read prescription. Please try another image.",
      );
    } finally {
      setUiLoading(false);
    }
  };

  const updateMedicine = (idx, field, value) => {
    setParsedMedicines((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    );
  };

  const addMedicine = () => {
    setParsedMedicines((prev) => [...prev, { name: "", qty: 1, freq: "" }]);
  };

  const removeMedicine = (idx) => {
    setParsedMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMedicinesToCart = () => {
    if (!parsedMedicines.length) return;

    const pickPrice = (med) => {
      const candidates = [
        med.price,
        med.mrp,
        med.cost,
        med.total,
        med.amount,
        med.rate,
        med.unitPrice,
      ];
      const first = candidates.find((v) => Number(v) > 0);
      if (Number(first) > 0) return Number(first);

      // Random price between ₹50-500 for meds not in database
      return Math.floor(Math.random() * 451) + 50;
    };

    parsedMedicines.forEach((med, idx) => {
      addItem({
        id: `rx-${med.name}-${idx}`,
        name: med.name || "RX Medicine",
        price: pickPrice(med),
        quantity: med.qty || 1,
        isRx: true,
      });
    });
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-white/60 shadow-sm">
      <div
        className="p-4 border-b border-border-subtle flex items-center justify-between"
        style={{ background: "linear-gradient(90deg, #FF6B4A10, #fff)" }}
      >
        <div>
          <p className="font-semibold text-ink">Upload Prescription</p>
          <p className="text-sm text-ink-soft">Drag & drop image or PDF</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
          Required for RX medicines
        </span>
      </div>

      <div
        className="p-6 border-dashed border-2 rounded-xl mx-4 mt-4 flex flex-col items-center justify-center gap-3 bg-orange-50"
        style={{ borderColor: "#FF6B4A" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="h-10 w-10 rounded-full bg-white shadow flex items-center justify-center text-orange-500 text-xl">
          ↑
        </div>
        <p className="text-ink font-semibold">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-ink-soft">JPEG, PNG, or PDF up to 10MB</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uiError && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-semibold">
          {uiError}
        </div>
      )}

      {preview && (
        <div className="p-4 flex gap-4 items-start">
          <img
            src={preview}
            alt="Prescription preview"
            className="w-32 h-32 object-cover rounded-lg border border-border-subtle"
          />
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-sm text-ink-soft">Doctor Name</label>
              <input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full mt-1 rounded-lg border border-border-subtle px-3 py-2"
                placeholder="Dr. A Sharma"
              />
            </div>
            <div>
              <label className="text-sm text-ink-soft">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full mt-1 rounded-lg border border-border-subtle px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        <p className="text-sm font-semibold text-ink">OCR Preview</p>
        {loading || uiLoading ? (
          <div className="space-y-2">
            {skeletonLines.map((_, idx) => (
              <div
                key={idx}
                className="h-3 rounded-full bg-border-subtle animate-pulse"
                style={{ width: `${70 + idx * 6}%` }}
              ></div>
            ))}
          </div>
        ) : (
          <textarea
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Extracted text will appear here. You can edit if OCR misses something."
            className="w-full h-28 rounded-lg border border-border-subtle px-3 py-2"
          />
        )}
      </div>

      {ocrText && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle">
          {parsedMedicines.length === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-900">
                <strong>⚠️ No medicines detected</strong> from the prescription
                image. Please add medicines manually.
              </p>
            </div>
          )}

          {parsedMedicines.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <div className="text-ink font-bold text-lg">Medicines</div>
              {expiryDate && (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  Expires on {new Date(expiryDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {parsedMedicines.map((med, idx) => (
              <div
                key={`${med.name}-${idx}`}
                className="rounded-lg border border-border-subtle bg-white/70 shadow-sm p-3 grid grid-cols-12 gap-2"
              >
                <input
                  className="col-span-6 rounded border border-border-subtle px-3 py-2 text-sm"
                  value={med.name}
                  onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                  placeholder="Medicine name"
                />
                <input
                  className="col-span-2 rounded border border-border-subtle px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  value={med.qty || 1}
                  onChange={(e) =>
                    updateMedicine(idx, "qty", Number(e.target.value))
                  }
                  placeholder="Qty"
                />
                <input
                  className="col-span-3 rounded border border-border-subtle px-3 py-2 text-sm"
                  value={med.freq || ""}
                  onChange={(e) => updateMedicine(idx, "freq", e.target.value)}
                  placeholder="Freq (e.g. 1-0-1)"
                />
                <button
                  type="button"
                  onClick={() => removeMedicine(idx)}
                  className="col-span-1 text-red-600 font-bold hover:underline"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMedicine}
              className="w-full px-4 py-2 rounded-lg border border-dashed border-border-subtle text-ink hover:bg-page"
            >
              + Add medicine
            </button>
          </div>

          {parsedMedicines.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center pt-2">
              <button
                type="button"
                onClick={addMedicinesToCart}
                className="px-5 py-3 rounded-lg bg-[#FF6B4A] text-white font-semibold shadow hover:scale-105 transition-transform"
              >
                Add Selected Medicines to Cart
              </button>
              <div className="text-sm text-ink-soft">
                Doctor:{" "}
                <span className="font-semibold text-ink">
                  {doctorName || "N/A"}
                </span>{" "}
                • Issue: {issueDate || "N/A"}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 flex items-center justify-end gap-3 border-t border-border-subtle">
        <button
          className="px-4 py-2 rounded-lg border border-border-subtle text-ink"
          type="button"
          onClick={() => {
            setFiles([]);
            setPreview(null);
            setOcrText("");
            setDoctorName("");
            setIssueDate("");
            setParsedMedicines([]);
            setUiError(null);
          }}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-[#FF6B4A] text-white font-semibold shadow"
          type="button"
          disabled={loading || uiLoading || !files.length}
          onClick={submit}
        >
          {loading || uiLoading ? "Extracting details…" : "Save Prescription"}
        </button>
      </div>
    </div>
  );
};

export default PrescriptionUpload;
