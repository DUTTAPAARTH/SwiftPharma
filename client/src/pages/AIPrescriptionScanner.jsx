import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { scanPrescription } from "../services/aiScanService";
import { useCart } from "../hooks/useCart";

const AIPrescriptionScanner = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [medicines, setMedicines] = useState([]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload a JPG or PNG image");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
    setResults(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleScan = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const { data } = await scanPrescription(formData);

      if (!data.success) {
        throw new Error(data.message || "Scan failed");
      }

      setResults(data);

      // Normalize medicines - ensure they have all required fields
      const normalizedMedicines = (data.medicines || []).map((med) => ({
        id: med.id || `med-${Date.now()}-${Math.random()}`,
        name: med.name || "Unknown Medicine",
        strength: med.strength || "",
        dosage: med.dosage || "Tablet",
        frequency: med.frequency || "As directed",
        duration: med.duration || "",
        quantity: med.quantity || 1,
        notes: med.notes || "",
        warnings: med.warnings || [],
        selected: true,
      }));

      setMedicines(normalizedMedicines);

      if (normalizedMedicines.length === 0) {
        setError(
          data.message ||
            "No medicines were detected. Please try a clearer image."
        );
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to scan prescription. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMedicine = (index) => {
    setMedicines((prev) =>
      prev.map((med, i) =>
        i === index ? { ...med, selected: !med.selected } : med
      )
    );
  };

  const removeMedicine = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const addSelectedToCart = () => {
    const selected = medicines.filter((med) => med.selected);

    if (selected.length === 0) {
      setError("Please select at least one medicine");
      return;
    }

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

    selected.forEach((med) => {
      addItem({
        id: med.id || `med-${Date.now()}-${Math.random()}`,
        name: `${med.name}${med.strength ? ` ${med.strength}` : ""}`,
        price: pickPrice(med),
        quantity: med.quantity || 1,
        isRx: true,
        prescriptionId: results?.prescriptionId,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        notes: med.notes,
      });
    });

    navigate("/cart");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setMedicines([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-semibold text-sm">
            <span className="text-lg">🤖</span>
            <span>AI-Powered Scanner</span>
          </div>
          <h1 className="text-4xl font-nexus-bold text-headline">
            Prescription Scanner
          </h1>
          <p className="text-ink-soft text-lg max-w-2xl mx-auto">
            Upload your prescription and let AI extract medicine details
            automatically
          </p>
        </div>

        {/* Upload Section */}
        {!preview && (
          <div className="card-base p-8">
            <div
              className="border-2 border-dashed border-[#FF6B4A] rounded-2xl p-12 text-center space-y-4 bg-gradient-to-br from-orange-50 to-white cursor-pointer hover:border-[#FF5A3A] transition-all"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#FF8A6A] flex items-center justify-center text-white text-4xl shadow-lg">
                📄
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-ink">
                  Drop prescription image here
                </p>
                <p className="text-ink-soft">or click to browse files</p>
                <p className="text-sm text-ink-soft">
                  Supports JPG, PNG • Max 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Preview & Scan */}
        {preview && !results && (
          <div className="card-base p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-nexus-bold text-headline">
                Preview & Scan
              </h2>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border border-border-subtle text-ink hover:bg-page transition-colors"
              >
                Change Image
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <img
                  src={preview}
                  alt="Prescription preview"
                  className="w-full h-auto rounded-xl shadow-lg border border-border-subtle"
                />
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 space-y-3">
                  <h3 className="text-lg font-semibold text-ink">
                    Ready to scan
                  </h3>
                  <p className="text-sm text-ink-soft">Our AI will extract:</p>
                  <ul className="space-y-2 text-sm text-ink-soft">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Medicine names & strengths
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Dosage & frequency
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Doctor information
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Issue date & validity
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF8A6A] text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⚙️</span>
                      Scanning...
                    </span>
                  ) : (
                    "Start AI Scan"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {loading && (
          <div className="card-base p-12">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto">
                <div className="animate-spin rounded-full h-24 w-24 border-8 border-gray-200 border-t-[#FF6B4A]"></div>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-ink">
                  AI is analyzing your prescription...
                </p>
                <p className="text-ink-soft">This may take a few moments</p>
              </div>
              <div className="flex justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="card-base p-6 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results && medicines.length > 0 && (
          <div className="space-y-6">
            {/* Success Banner */}
            <div className="card-base p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div className="flex-1">
                  <p className="font-semibold text-green-900 text-lg">
                    {results.message}
                  </p>
                  <p className="text-green-700 text-sm">
                    Review and select medicines to add to cart
                  </p>
                  {results.extractionMethod === "ai" && (
                    <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                      <span>🤖</span>
                      <span>Analyzed using GPT-4 Vision AI</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Analysis Info */}
            {results.aiAnalysis && (
              <div className="card-base p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <h3 className="font-semibold text-purple-900 text-lg">
                      AI Analysis
                    </h3>
                  </div>
                  {results.aiAnalysis.patientName && (
                    <div>
                      <p className="text-sm text-purple-700 font-medium">
                        Patient Name
                      </p>
                      <p className="text-purple-900">
                        {results.aiAnalysis.patientName}
                      </p>
                    </div>
                  )}
                  {results.aiAnalysis.diagnosis && (
                    <div>
                      <p className="text-sm text-purple-700 font-medium">
                        Diagnosis
                      </p>
                      <p className="text-purple-900">
                        {results.aiAnalysis.diagnosis}
                      </p>
                    </div>
                  )}
                  {results.aiAnalysis.instructions && (
                    <div>
                      <p className="text-sm text-purple-700 font-medium">
                        Special Instructions
                      </p>
                      <p className="text-purple-900">
                        {results.aiAnalysis.instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Drug Interactions Warning */}
            {results.drugInteractions?.hasInteractions && (
              <div className="card-base p-6 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="font-semibold text-red-900 text-lg">
                      Drug Interaction Warnings
                    </h3>
                  </div>
                  {results.drugInteractions.interactions.map(
                    (interaction, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg ${
                          interaction.severity === "severe"
                            ? "bg-red-100 border border-red-300"
                            : interaction.severity === "moderate"
                            ? "bg-orange-100 border border-orange-300"
                            : "bg-yellow-100 border border-yellow-300"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              interaction.severity === "severe"
                                ? "bg-red-600 text-white"
                                : interaction.severity === "moderate"
                                ? "bg-orange-600 text-white"
                                : "bg-yellow-600 text-white"
                            }`}
                          >
                            {interaction.severity}
                          </span>
                          <p className="font-semibold text-sm">
                            {interaction.medicines.join(" + ")}
                          </p>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">
                          {interaction.description}
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                          💡 {interaction.recommendation}
                        </p>
                      </div>
                    )
                  )}
                  {results.drugInteractions.generalWarnings?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-semibold text-red-900">
                        General Warnings:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {results.drugInteractions.generalWarnings.map(
                          (warning, idx) => (
                            <li key={idx} className="text-sm text-red-800">
                              {warning}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-red-700 italic mt-3">
                    ⚕️ Please consult your doctor or pharmacist before taking
                    these medicines together.
                  </p>
                </div>
              </div>
            )}

            {/* Doctor Info */}
            {results.doctor?.name && (
              <div className="card-base p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl">
                    👨‍⚕️
                  </div>
                  <div>
                    <p className="text-sm text-ink-soft">Prescribed by</p>
                    <p className="font-semibold text-ink text-lg">
                      {results.doctor.name}
                    </p>
                    {results.doctor.reg_no && (
                      <p className="text-xs text-ink-soft">
                        Reg: {results.doctor.reg_no}
                      </p>
                    )}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-ink-soft">Issue Date</p>
                    <p className="font-semibold text-ink">
                      {new Date(results.issuedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Medicines List */}
            <div className="card-base p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-nexus-bold text-headline">
                  Detected Medicines
                </h2>
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold">
                  {medicines.filter((m) => m.selected).length} selected
                </span>
              </div>

              <div className="space-y-3">
                {medicines.map((medicine, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      medicine.selected
                        ? "border-[#FF6B4A] bg-orange-50"
                        : "border-border-subtle bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleMedicine(index)}
                        className={`mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          medicine.selected
                            ? "border-[#FF6B4A] bg-[#FF6B4A] text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {medicine.selected && "✓"}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-ink text-lg">
                              {medicine.name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-1 text-sm text-ink-soft">
                              <span className="px-2 py-1 rounded bg-white border border-border-subtle">
                                {medicine.strength}
                              </span>
                              <span className="px-2 py-1 rounded bg-white border border-border-subtle">
                                {medicine.dosage}
                              </span>
                              <span className="px-2 py-1 rounded bg-white border border-border-subtle">
                                {medicine.frequency}
                              </span>
                              {medicine.duration && (
                                <span className="px-2 py-1 rounded bg-white border border-border-subtle">
                                  {medicine.duration}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMedicine(index)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-border-subtle text-ink font-semibold hover:bg-page transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={addSelectedToCart}
                disabled={medicines.filter((m) => m.selected).length === 0}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF8A6A] text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {medicines.filter((m) => m.selected).length} to Cart
              </button>
            </div>
          </div>
        )}

        {/* Empty Results */}
        {results && medicines.length === 0 && (
          <div className="card-base p-12 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-yellow-100 flex items-center justify-center text-5xl">
              🔍
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-ink">
                No medicines detected
              </h3>
              <p className="text-ink-soft max-w-md mx-auto">
                We couldn't extract medicine information from this image. Please
                try uploading a clearer photo or enter medicines manually.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl border-2 border-border-subtle text-ink font-semibold hover:bg-page transition-colors"
              >
                Try Another Image
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-[#FF6B4A] text-white font-semibold hover:bg-[#FF5A3A] transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AIPrescriptionScanner;
