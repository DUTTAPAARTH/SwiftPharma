import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-nexus-bold">
      <Navbar />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
              <span className="size-2 rounded-full bg-primary animate-pulse"></span>{" "}
              Your account
            </div>
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              My profile
            </h1>
            <p className="text-slate-500 font-medium">
              Manage your prescriptions, view order history, and keep account
              details up to date.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/orders">
              <button className="h-14 px-8 rounded-full border border-slate-200 dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Order History
              </button>
            </Link>
            <Link to="/cart">
              <button className="h-14 px-8 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                View Cart
              </button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* User Bio Card */}
          <div className="lg:col-span-1 space-y-10">
            <div className="bg-white dark:bg-slate-800 rounded-[40px] p-10 border border-slate-100 dark:border-slate-700 shadow-soft space-y-10 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-9xl font-black">
                  badge
                </span>
              </div>
              <div className="size-24 rounded-[32px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                <span className="material-symbols-outlined text-4xl text-primary font-black">
                  person
                </span>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Account status
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Verified customer
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-slate-500">
                    Secure access enabled
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-[40px] p-10 border border-primary/10 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">
                Emergency Contact
              </h4>
              <p className="text-slate-400 text-sm font-medium">
                Add a trusted contact for urgent delivery or
                prescription-related communication.
              </p>
              <button className="w-full h-14 rounded-3xl bg-white dark:bg-slate-800 border border-primary/20 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                Add contact
              </button>
            </div>
          </div>

          {/* Prescription Archive */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white dark:bg-slate-800 rounded-[40px] p-10 border border-slate-100 dark:border-slate-700 shadow-soft space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Prescription history
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    Showing {filtered.length} prescription records
                  </p>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                  {["all", "valid", "expired"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        tab === t
                          ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="py-20 text-center space-y-6">
                    <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700">
                      inventory_2
                    </span>
                    <p className="text-slate-400 font-bold">
                      No prescriptions to show yet.
                    </p>
                  </div>
                ) : (
                  filtered.map((rx) => (
                    <div
                      key={rx._id}
                      className="p-8 rounded-[32px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="size-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary font-black">
                            description
                          </span>
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {rx.doctorName || "Certified Physician"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Expires{" "}
                            {new Date(rx.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            rx.isExpired
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {rx.isExpired ? "Expired" : "Active"}
                        </span>
                        <button className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors">
                          download
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <PrescriptionUpload onSubmit={upload} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
