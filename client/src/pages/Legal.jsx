import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const Legal = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("privacy");

  useEffect(() => {
    const path = location.pathname.split("/").pop();
    if (["privacy", "terms", "safety", "help"].includes(path)) {
      setActiveTab(path);
    }
  }, [location]);

  const tabs = [
    { id: "privacy", label: "Privacy Policy", icon: "shield_lock" },
    { id: "terms", label: "Terms of Service", icon: "gavel" },
    { id: "safety", label: "Safety Information", icon: "medical_information" },
    { id: "help", label: "Help Center", icon: "help_center" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "privacy":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Privacy Policy</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              SwiftPharma is committed to protecting your medical and personal data in compliance with the Information Technology Act, 2000 and SPDI Rules.
            </p>
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">1. Data Collection</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                We collect health information, prescriptions, and personal identifiers solely for the purpose of processing medical orders and providing AI-driven health insights.
              </p>
            </section>
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">2. Data Security</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                All prescription data is encrypted at rest and in transit. We do not share your medical history with third-party advertisers.
              </p>
            </section>
            <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 mt-12">
              <h4 className="font-black text-primary uppercase tracking-widest text-sm mb-2">Grievance Officer</h4>
              <p className="text-slate-700 dark:text-slate-300 font-bold">Mr. Aditya Sharma</p>
              <p className="text-slate-500 text-sm">Email: grievance@swiftpharma.in</p>
              <p className="text-slate-500 text-sm">Address: Sector 44, Gurgaon, Haryana, India</p>
            </div>
          </div>
        );
      case "terms":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Terms of Service</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              By using SwiftPharma, you agree to comply with Indian e-pharmacy regulations and the Drugs and Cosmetics Act, 1940.
            </p>
            <section className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">1. Prescription Mandatory</h3>
              <p>Schedule H, H1, and X drugs will NOT be dispensed without a valid prescription from a Registered Medical Practitioner (RMP).</p>
            </section>
            <section className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">2. Pharmacist Verification</h3>
              <p>Every order is subject to verification by our Licensed Pharmacists. Orders may be rejected if the prescription is invalid or expired.</p>
            </section>
            <section className="space-y-4 text-slate-600 dark:text-slate-400 font-medium">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">3. Retail License</h3>
              <p>SwiftPharma operates under valid Drug Licenses (Form 20, 20B, 21, 21B) issued by the State Drug Controller.</p>
            </section>
          </div>
        );
      case "safety":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Safety Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-[32px]">
                <span className="material-symbols-outlined text-amber-500 text-4xl mb-4">warning</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase">Storage Warning</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Always store medicines in a cool, dry place away from direct sunlight. Insulin and certain vaccines must be refrigerated.</p>
              </div>
              <div className="p-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-[32px]">
                <span className="material-symbols-outlined text-blue-500 text-4xl mb-4">verified_user</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase">Authenticity Check</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Scan the QR code on the packaging to verify the batch number and expiry date of your medicines.</p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[40px] mt-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Drug Reactions</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                If you experience any adverse reactions (rash, swelling, breathlessness), discontinue use immediately and contact our 24/7 pharmacist helpline or your nearest emergency room.
              </p>
            </div>
          </div>
        );
      case "help":
        return (
          <div className="space-y-8 animate-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Help Center</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "Ordering", icon: "shopping_cart", desc: "How to upload prescriptions and add medicines to your cart." },
                { title: "Delivery", icon: "local_shipping", desc: "Track your 15-30 minute express delivery in real-time." },
                { title: "Returns", icon: "assignment_return", desc: "Our 7-day easy return policy for non-medical items." },
                { title: "Payments", icon: "payments", desc: "Safe and secure UPI, Card, and COD payment options." },
              ].map((faq) => (
                <div key={faq.title} className="flex gap-6 p-6 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-3xl transition-colors cursor-pointer group">
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined">{faq.icon}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 dark:text-white">{faq.title}</h4>
                    <p className="text-sm text-slate-500 font-medium">{faq.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Sidebar */}
            <aside className="lg:w-80 flex flex-col gap-2">
              <h1 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-4">Legal & Support</h1>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all text-sm justify-start ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}

              <div className="mt-12 p-8 bg-slate-900 rounded-[32px] text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Emergency Contact</p>
                <p className="text-lg font-black mb-1">1800-SWIFT-MED</p>
                <p className="text-xs text-slate-400 font-medium">24/7 Pharmacist Support</p>
              </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 max-w-4xl">
              <div className="bg-white dark:bg-slate-900/50 rounded-[48px] p-8 md:p-16 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none min-h-[600px]">
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
