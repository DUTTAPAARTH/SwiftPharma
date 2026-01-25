import React from "react";

const Footer = () => (
  <footer className="bg-background text-primary-text py-12 mt-20 relative overflow-hidden border-t-4 border-t-gradient-brand">
    {/* Brand gradient line at top */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand"></div>

    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
      <div className="grid md:grid-cols-4 gap-10 mb-12">
        {/* Brand */}
        <div>
          <h4 className="font-nexus-bold text-2xl mb-3 text-primary-text">
            SwiftPharma
          </h4>
          <p className="text-sm font-roserri leading-relaxed text-secondary-text">
            Fast, reliable medicine delivery across India. Your health is our
            priority.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="#"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-secondary-text hover:text-brand-coral hover:border-brand-coral hover:bg-[#FFF4F2] transition-all duration-300"
            >
              f
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-secondary-text hover:text-brand-coral hover:border-brand-coral hover:bg-[#FFF4F2] transition-all duration-300"
            >
              𝕏
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-secondary-text hover:text-brand-coral hover:border-brand-coral hover:bg-[#FFF4F2] transition-all duration-300"
            >
              in
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-nexus-bold text-lg mb-4 text-primary-text">
            Quick Links
          </h4>
          <ul className="text-sm text-secondary-text space-y-2.5 font-roserri">
            <li>
              <a
                href="/categories"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Categories
              </a>
            </li>
            <li>
              <a
                href="/orders"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Orders
              </a>
            </li>
            <li>
              <a
                href="/profile"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Profile
              </a>
            </li>
            <li>
              <a
                href="/wishlist"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Wishlist
              </a>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-nexus-bold text-lg mb-4 text-primary-text">
            Support
          </h4>
          <ul className="text-sm text-secondary-text space-y-2.5 font-roserri">
            <li>
              <a
                href="#"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Contact Us
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:text-brand-coral transition-colors duration-300"
              >
                FAQ
              </a>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="font-nexus-bold text-lg mb-4 text-primary-text">
            Newsletter
          </h4>
          <p className="text-sm text-secondary-text mb-4 font-roserri">
            Subscribe for health tips and exclusive offers.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white text-primary-text placeholder-ink-muted text-sm border border-border focus:outline-none focus:ring-2 focus:ring-brand-coral focus:border-brand-coral"
            />
            <button className="px-4 py-2.5 bg-gradient-brand text-white rounded-xl hover:shadow-glow transition-all duration-300 font-semibold text-sm">
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-secondary-text gap-4">
        <span>
          © {new Date().getFullYear()} SwiftPharma. All rights reserved.
        </span>
        <span className="text-brand-coral font-semibold inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-coral"></span>
          Verified Pharmacy Partner
        </span>
      </div>
    </div>
  </footer>
);

export default Footer;
