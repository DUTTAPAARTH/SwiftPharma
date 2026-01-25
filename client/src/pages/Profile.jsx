import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/common/Button";
import { usePrescription } from "../hooks/usePrescription";
import PrescriptionUpload from "../components/forms/PrescriptionUpload";

const Profile = () => {
  const { prescriptions, loadPrescriptions, upload } = usePrescription();
  const [tab, setTab] = useState("all");

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const filtered = useMemo(() => {
    if (tab === "valid") return prescriptions.filter((p) => !p.isExpired);
    if (tab === "expired") return prescriptions.filter((p) => p.isExpired);
    return prescriptions;
  }, [tab, prescriptions]);

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div>
          <h1 className="text-headline font-nexus-bold mb-4">My Profile</h1>
          <div className="accent-bar-violet w-16"></div>
        </div>
        <div className="card-base p-8 space-y-4">
          <p className="text-ink-soft text-lg font-roserri">
            Manage your medical history and delivery addresses.
          </p>
          <div className="flex gap-3">
            <Link to="/orders" className="flex-1">
              <Button variant="secondary" className="w-full text-lg py-3">
                View Orders
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="cta" className="w-full text-lg py-3">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>

        <div className="card-base p-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-ink">My Prescriptions</p>
            <div className="flex gap-2">
              <button
                onClick={() => setTab("all")}
                className={`px-3 py-1 rounded-full text-sm ${
                  tab === "all"
                    ? "bg-brand text-white"
                    : "bg-border-subtle text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("valid")}
                className={`px-3 py-1 rounded-full text-sm ${
                  tab === "valid"
                    ? "bg-green-600 text-white"
                    : "bg-border-subtle text-ink"
                }`}
              >
                Valid
              </button>
              <button
                onClick={() => setTab("expired")}
                className={`px-3 py-1 rounded-full text-sm ${
                  tab === "expired"
                    ? "bg-red-600 text-white"
                    : "bg-border-subtle text-ink"
                }`}
              >
                Expired
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-ink-soft text-sm">No prescriptions yet.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((rx) => (
                <div
                  key={rx._id}
                  className="p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {rx.doctorName || "Doctor"}
                    </p>
                    <p className="text-xs text-ink-soft">
                      Valid until {new Date(rx.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      rx.isExpired
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {rx.isExpired ? "Expired" : "Valid"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <PrescriptionUpload onSubmit={upload} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
