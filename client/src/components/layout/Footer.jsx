import React from "react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl text-slate-900 dark:text-white py-20 border-t border-slate-100 dark:border-slate-800">
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        {/* Brand */}
        <div className="col-span-1 md:col-span-1 lg:border-r border-slate-100 dark:border-slate-800 pr-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl font-bold">
                medical_services
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tighter">
              SwiftPharma
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
            Fast, dependable medicine delivery across India, backed by licensed
            pharmacists and compliant fulfillment.
          </p>
          <div className="flex gap-4">
            {["facebook", "instagram", "youtube"].map((icon) => (
              <a
                key={icon}
                href="#"
                className="size-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-300"
              >
                <span className="material-symbols-outlined text-xl">
                  {icon}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Links Sections */}
        <div>
          <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-400">
            Company
          </h4>
          <ul className="space-y-4">
            {["About Us", "Contact Us", "Careers", "Blog"].map((link) => (
              <li key={link}>
                <Link
                  to={`/${link.toLowerCase().replace(" ", "-")}`}
                  className="text-slate-600 dark:text-slate-400 font-bold hover:text-primary transition-all duration-300"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-400">
            Support
          </h4>
          <ul className="space-y-4">
            {[
              { label: "Help Center", path: "/help" },
              { label: "Safety Information", path: "/safety" },
              { label: "Privacy Policy", path: "/privacy" },
              { label: "Terms of Service", path: "/terms" },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  to={link.path}
                  className="text-slate-600 dark:text-slate-400 font-bold hover:text-primary transition-all duration-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-400">
            Newsletter
          </h4>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
            Subscribe for refill reminders, health tips, and exclusive offers.
          </p>
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
            />
            <button className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-black rounded-2xl shadow-lg shadow-primary/20 transition-all">
              Join updates
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-1 items-center lg:items-start text-center lg:text-left">
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
            © {new Date().getFullYear()} SwiftPharma. Care delivered with speed.
          </p>
          <p className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">
            Drug License: 20-B/21-B MH-EZ-4567 • FSSAI: 12345678901234
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 items-center">
          <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <span className="material-symbols-outlined font-bold text-sm">
              verified
            </span>
            <span className="font-black uppercase tracking-widest text-[10px]">
              Pharmacist Checked Orders
            </span>
          </div>
          <div className="flex items-center gap-2 text-green-500 bg-green-500/5 px-4 py-2 rounded-full border border-green-500/10">
            <span className="material-symbols-outlined font-bold text-sm">
              security
            </span>
            <span className="font-black uppercase tracking-widest text-[10px]">
              Secure Payments
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-500 bg-blue-500/5 px-4 py-2 rounded-full border border-blue-500/10">
            <span className="material-symbols-outlined font-bold text-sm">
              support_agent
            </span>
            <span className="font-black uppercase tracking-widest text-[10px]">
              Grievance Officer
            </span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
