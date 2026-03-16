import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../hooks/useCart";

const links = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/categories", label: "Categories", icon: "category" },
  { href: "/ai-assistant", label: "AI Assistant", icon: "smart_toy" },
  { href: "/ai-prescription", label: "Prescriptions", icon: "prescriptions" },
  { href: "/prescription-status", label: "Rx Status", icon: "fact_check" },
  { href: "/cart", label: "Cart", icon: "shopping_cart" },
  { href: "/profile", label: "Profile", icon: "person" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 lg:px-8 py-4 pointer-events-none">
      <header
        className={`mx-auto max-w-[1280px] pointer-events-auto transition-all duration-500 rounded-[24px] border ${
          scrolled
            ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-white/20 dark:border-slate-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] py-2"
            : "bg-transparent border-transparent py-4"
        }`}
      >
        <div className="px-6 flex items-center justify-between h-12 md:h-14">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-3 group">
            <div className="size-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <span className="material-symbols-outlined text-2xl font-bold">
                medical_services
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-primary transition-colors">
              SwiftPharma
            </h2>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 bg-slate-100/60 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md">
            {links.slice(0, 5).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive(link.href)
                    ? "bg-primary text-white shadow shadow-primary/30"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60"
                }`}
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{
                    fontVariationSettings: isActive(link.href)
                      ? "'FILL' 1"
                      : "'FILL' 0",
                  }}
                >
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/cart"
              className="relative size-11 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm group"
            >
              <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
                shopping_cart
              </span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-3 pl-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 p-1 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                >
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <span className="material-symbols-outlined font-bold">
                      person
                    </span>
                  </div>
                  <span className="hidden sm:block text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    {user.name?.split(" ")[0] || "User"}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="size-11 flex items-center justify-center rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                  title="Logout"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="h-11 px-8 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Login
              </Link>
            )}

            {/* Mobile Toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden size-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <span className="material-symbols-outlined">
                {open ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {open && (
        <div className="mt-3 mx-auto max-w-[1280px] pointer-events-auto lg:hidden animate-in slide-in-from-top duration-300">
          <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-3 border border-slate-100 dark:border-slate-800 shadow-xl space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                  isActive(link.href)
                    ? "bg-primary text-white shadow shadow-primary/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{
                    fontVariationSettings: isActive(link.href)
                      ? "'FILL' 1"
                      : "'FILL' 0",
                  }}
                >
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default Navbar;
