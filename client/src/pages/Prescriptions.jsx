import React, { useState, useEffect } from "react";
import { usePrescription } from "../hooks/usePrescription";
import PrescriptionUpload from "../components/forms/PrescriptionUpload";

const Prescriptions = () => {
  const {
    prescriptions,
    loadPrescriptions,
    loading,
    error,
    validate,
    reupload,
  } = usePrescription();
  const [filter, setFilter] = useState("all"); // all, valid, expired, pending
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const getStatusBadge = (prescription) => {
    const now = new Date();
    const expiry = new Date(prescription.expiryDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (prescription.status === "rejected") {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md">
          ❌ Rejected
        </span>
      );
    }
    if (prescription.status === "invalid") {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gray-400 text-white shadow-md">
          ⚫ Invalid
        </span>
      );
    }
    if (prescription.status === "pending") {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#FFB020] to-[#FFCA5C] text-white shadow-md animate-pulse">
          ⏳ Pending Review
        </span>
      );
    }
    if (expiry < now) {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#FF4D4D] to-[#FF7070] text-white shadow-md">
          ❌ Expired
        </span>
      );
    }
    if (daysLeft <= 7) {
      return (
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#FF6B4A] to-[#FF906A] text-white shadow-md">
          ⚠️ Expires Soon
        </span>
      );
    }
    return (
      <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#28C76F] to-[#5BE89A] text-white shadow-md">
        ✔️ Valid
      </span>
    );
  };

  const getExpiryStatus = (prescription) => {
    const now = new Date();
    const expiry = new Date(prescription.expiryDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (expiry < now) return { status: "expired", daysLeft: 0 };
    if (daysLeft <= 7) return { status: "expiring", daysLeft };
    return { status: "valid", daysLeft };
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (filter === "all") return true;
    if (filter === "valid") {
      return rx.status === "approved" && new Date(rx.expiryDate) > new Date();
    }
    if (filter === "expired") {
      return new Date(rx.expiryDate) < new Date();
    }
    if (filter === "pending") {
      return rx.status === "pending";
    }
    return true;
  });

  const handleDownload = (imageUrl) => {
    window.open(imageUrl, "_blank");
  };

  const handleReupload = (prescription) => {
    setSelectedPrescription(prescription);
    setShowUpload(true);
  };

  const handleUploadSubmit = async (formData) => {
    const result = selectedPrescription
      ? await reupload(selectedPrescription._id, formData)
      : await upload(formData);
    await loadPrescriptions();
    setShowUpload(false);
    setSelectedPrescription(null);
    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F4EF]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl shadow-xl"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-96 bg-white rounded-2xl shadow-lg"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4EF]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Premium Header with Animated Icon */}
        <div className="mb-8 relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-[#7B5CFF] via-[#A795FF] to-[#C4B5FF] p-8 md:p-12">
          {/* Animated Medical Icon */}
          <div className="absolute top-4 right-4 md:top-8 md:right-12 animate-bounce">
            <svg
              className="w-20 h-20 md:w-32 md:h-32 text-white opacity-30"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
              </svg>
              <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                My Prescriptions
              </h1>
            </div>
            <p className="text-lg md:text-xl text-white font-medium drop-shadow">
              Manage your uploaded prescriptions for RX medicines
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-8 py-4 bg-gradient-to-r from-[#FF6B4A] via-[#FF906A] to-[#FFC1A3] text-white text-lg font-bold rounded-2xl shadow-2xl hover:scale-105 hover:shadow-[0_20px_60px_rgba(255,107,74,0.4)] transition-all duration-300 flex items-center gap-3"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {showUpload ? "Cancel Upload" : "Upload New Prescription"}
          </button>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="mb-8 rounded-3xl p-8 bg-white shadow-2xl border-2 border-[#E3DCD5]">
            <h2 className="text-2xl font-black text-[#1C1C1C] mb-6 flex items-center gap-3">
              <svg
                className="w-7 h-7 text-[#7B5CFF]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z" />
              </svg>
              {selectedPrescription
                ? "Reupload Prescription"
                : "Upload New Prescription"}
            </h2>
            <PrescriptionUpload
              onSubmit={handleUploadSubmit}
              existingPrescription={selectedPrescription}
            />
          </div>
        )}

        {/* Premium Filter Tabs with Icons */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {[
            {
              key: "all",
              label: "All",
              icon: "📋",
              gradient: "from-[#7B5CFF] to-[#A795FF]",
            },
            {
              key: "valid",
              label: "Valid",
              icon: "✔️",
              gradient: "from-[#28C76F] to-[#5BE89A]",
            },
            {
              key: "pending",
              label: "Pending",
              icon: "⏳",
              gradient: "from-[#FFB020] to-[#FFCA5C]",
            },
            {
              key: "expired",
              label: "Expired",
              icon: "❌",
              gradient: "from-[#FF4D4D] to-[#FF7070]",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                filter === tab.key
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-2xl scale-105`
                  : "bg-white text-[#1C1C1C] hover:scale-105 shadow-lg hover:shadow-xl border-2 border-[#E3DCD5]"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Prescriptions List */}
        {filteredPrescriptions.length === 0 ? (
          <div className="rounded-3xl p-16 text-center bg-white shadow-2xl border-2 border-[#E3DCD5] backdrop-blur-lg">
            {/* Animated Rx Icon */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-[#7B5CFF] to-[#A795FF] rounded-full animate-ping opacity-20"></div>
              <svg
                className="relative w-32 h-32 text-[#7B5CFF] animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
              </svg>
            </div>
            <h3 className="text-3xl font-black text-[#1C1C1C] mb-3">
              No Prescriptions Found
            </h3>
            <p className="text-lg text-[#6A6060] mb-8 max-w-md mx-auto">
              {filter === "all"
                ? "Upload your first prescription to purchase RX medicines"
                : `No ${filter} prescriptions available`}
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-10 py-4 bg-gradient-to-r from-[#FF6B4A] via-[#FF906A] to-[#FFC1A3] text-white text-lg font-bold rounded-2xl shadow-2xl hover:scale-105 hover:shadow-[0_20px_60px_rgba(255,107,74,0.4)] transition-all duration-300 flex items-center gap-3 mx-auto"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Upload Prescription
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrescriptions.map((rx) => {
              const expiryInfo = getExpiryStatus(rx);
              return (
                <div
                  key={rx._id}
                  className="rounded-3xl bg-white p-6 shadow-xl border-2 border-[#E3DCD5] hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(123,92,255,0.2)] transition-all duration-300 group"
                >
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-5">
                    {getStatusBadge(rx)}
                    <span className="text-xs font-bold text-[#6A6060] bg-[#F5F4EF] px-3 py-1 rounded-full">
                      #{rx._id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-[#7B5CFF]"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                      </svg>
                      <h3 className="text-xl font-black text-[#1C1C1C]">
                        Dr. {rx.doctorName || "N/A"}
                      </h3>
                    </div>
                    <p className="text-sm font-semibold text-[#6A6060] flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                      </svg>
                      Issued: {new Date(rx.issueDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Expiry Info */}
                  <div className="mb-5 p-4 bg-gradient-to-br from-[#F5F4EF] to-[#EDE7FF] rounded-2xl border-2 border-[#E3DCD5]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-[#6A6060]">
                        Expiry Date
                      </span>
                      <span className="text-sm font-black text-[#1C1C1C]">
                        {new Date(rx.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    {expiryInfo.status === "valid" && (
                      <p className="text-xs font-bold text-[#28C76F] flex items-center gap-1">
                        <span>✔️</span> Valid for {expiryInfo.daysLeft} more
                        days
                      </p>
                    )}
                    {expiryInfo.status === "expiring" && (
                      <p className="text-xs font-bold text-[#FF6B4A] flex items-center gap-1 animate-pulse">
                        <span>⚠️</span> Expires in {expiryInfo.daysLeft} days
                      </p>
                    )}
                    {expiryInfo.status === "expired" && (
                      <p className="text-xs font-bold text-[#FF4D4D] flex items-center gap-1">
                        <span>❌</span> Expired
                      </p>
                    )}
                  </div>

                  {/* Medicines */}
                  {rx.medicines && rx.medicines.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-black text-[#6A6060] mb-2 tracking-wider">
                        💊 MEDICINES
                      </p>
                      <div className="space-y-2">
                        {rx.medicines.slice(0, 3).map((med, idx) => (
                          <div
                            key={idx}
                            className="text-sm font-semibold text-[#1C1C1C] bg-[#F5F4EF] px-3 py-2 rounded-lg"
                          >
                            • {med.name} {med.dosage && `(${med.dosage})`}
                          </div>
                        ))}
                        {rx.medicines.length > 3 && (
                          <p className="text-xs font-bold text-[#7B5CFF]">
                            +{rx.medicines.length - 3} more medicines
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OCR Preview */}
                  {rx.ocrText && (
                    <div className="mb-5">
                      <p className="text-xs font-black text-[#6A6060] mb-2 tracking-wider">
                        🔍 OCR EXTRACT
                      </p>
                      <p className="text-xs font-medium text-[#1C1C1C] bg-[#F5F4EF] p-3 rounded-lg max-h-20 overflow-hidden border border-[#E3DCD5]">
                        {rx.ocrText.slice(0, 100)}...
                      </p>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {rx.adminNotes && (
                    <div className="mb-5 p-4 bg-gradient-to-r from-[#FFB020] to-[#FFCA5C] rounded-2xl shadow-lg">
                      <p className="text-xs font-black text-white mb-1 tracking-wider">
                        📝 ADMIN NOTE
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {rx.adminNotes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDownload(rx.images[0])}
                      className="flex-1 px-5 py-3 bg-gradient-to-r from-[#7B5CFF] to-[#A795FF] text-white text-sm font-bold rounded-xl shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
                    >
                      👁️ View
                    </button>
                    {(rx.status === "rejected" ||
                      expiryInfo.status === "expired") && (
                      <button
                        onClick={() => handleReupload(rx)}
                        className="flex-1 px-5 py-3 bg-gradient-to-r from-[#FF6B4A] to-[#FF906A] text-white text-sm font-bold rounded-xl shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
                      >
                        📤 Reupload
                      </button>
                    )}
                  </div>

                  {/* Upload Date */}
                  <p className="text-xs font-semibold text-[#6A6060] text-center mt-4 flex items-center justify-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                    Uploaded {new Date(rx.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Premium Stats Cards with Gradients & Icons */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total */}
          <div className="rounded-3xl bg-gradient-to-br from-[#7B5CFF] to-[#A795FF] p-6 text-center shadow-2xl hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(123,92,255,0.4)] transition-all duration-300 group">
            <div className="flex justify-center mb-3">
              <svg
                className="w-12 h-12 text-white group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z" />
              </svg>
            </div>
            <div className="text-5xl font-black text-white mb-2 drop-shadow-lg">
              {prescriptions.length}
            </div>
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Total
            </div>
          </div>

          {/* Valid */}
          <div className="rounded-3xl bg-gradient-to-br from-[#28C76F] to-[#5BE89A] p-6 text-center shadow-2xl hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(40,199,111,0.4)] transition-all duration-300 group">
            <div className="flex justify-center mb-3">
              <svg
                className="w-12 h-12 text-white group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div className="text-5xl font-black text-white mb-2 drop-shadow-lg">
              {
                prescriptions.filter(
                  (rx) =>
                    rx.status === "approved" &&
                    new Date(rx.expiryDate) > new Date()
                ).length
              }
            </div>
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Valid
            </div>
          </div>

          {/* Pending */}
          <div className="rounded-3xl bg-gradient-to-br from-[#FFB020] to-[#FFCA5C] p-6 text-center shadow-2xl hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(255,176,32,0.4)] transition-all duration-300 group">
            <div className="flex justify-center mb-3">
              <svg
                className="w-12 h-12 text-white group-hover:scale-110 group-hover:rotate-180 transition-all duration-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div className="text-5xl font-black text-white mb-2 drop-shadow-lg animate-pulse">
              {prescriptions.filter((rx) => rx.status === "pending").length}
            </div>
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Pending
            </div>
          </div>

          {/* Expired */}
          <div className="rounded-3xl bg-gradient-to-br from-[#FF4D4D] to-[#FF7070] p-6 text-center shadow-2xl hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(255,77,77,0.4)] transition-all duration-300 group">
            <div className="flex justify-center mb-3">
              <svg
                className="w-12 h-12 text-white group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
              </svg>
            </div>
            <div className="text-5xl font-black text-white mb-2 drop-shadow-lg">
              {
                prescriptions.filter(
                  (rx) => new Date(rx.expiryDate) < new Date()
                ).length
              }
            </div>
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Expired
            </div>
          </div>
        </div>

        {/* Premium Help Section with High Contrast */}
        <div className="mt-10 rounded-3xl bg-gradient-to-br from-[#FF6B4A] via-[#FF906A] to-[#FFC1A3] p-8 md:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <h3 className="text-3xl font-black text-white drop-shadow-lg">
              About Prescriptions
            </h3>
          </div>
          <ul className="space-y-4">
            <li className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">✔️</span>
              </div>
              <span className="text-base md:text-lg font-semibold leading-relaxed">
                Prescriptions are valid for{" "}
                <strong className="font-black">6 months</strong> from issue date
              </span>
            </li>
            <li className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">⚠️</span>
              </div>
              <span className="text-base md:text-lg font-semibold leading-relaxed">
                You'll receive a warning when a prescription expires within{" "}
                <strong className="font-black">7 days</strong>
              </span>
            </li>
            <li className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">🔒</span>
              </div>
              <span className="text-base md:text-lg font-semibold leading-relaxed">
                Only{" "}
                <strong className="font-black">approved prescriptions</strong>{" "}
                can be used for checkout
              </span>
            </li>
            <li className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">🕒</span>
              </div>
              <span className="text-base md:text-lg font-semibold leading-relaxed">
                Admin reviews prescriptions within{" "}
                <strong className="font-black">24-48 hours</strong>
              </span>
            </li>
            <li className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">📤</span>
              </div>
              <span className="text-base md:text-lg font-semibold leading-relaxed">
                You can <strong className="font-black">reupload</strong>{" "}
                rejected or expired prescriptions
              </span>
            </li>
            <li className="flex items-start gap-4 text-white">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">🛒</span>
              </div>
              <span className="text-base md:text-lg font-semibold leading-relaxed">
                RX products{" "}
                <strong className="font-black">
                  require a valid prescription
                </strong>{" "}
                to purchase
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Prescriptions;
