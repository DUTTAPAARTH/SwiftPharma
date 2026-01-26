import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../hooks/useCart";

const links = [
  { href: "/home", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/ai-prescription", label: "Prescriptions" },
  { href: "/cart", label: "Cart" },
  { href: "/profile", label: "Profile" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? "shadow-lifted" : "shadow-soft"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          to="/dashboard"
          className="text-2xl font-nexus-bold tracking-tight text-brand hover:text-brand-dark transition-colors duration-300"
        >
          SwiftPharma
        </Link>
        <button
          type="button"
          className="md:hidden inline-flex items-center px-3 py-2 text-brand hover:scale-110 transition-transform"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle navigation"
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
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-ink hover:text-brand transition-colors duration-300 relative group"
            >
              <span className="inline-flex items-center gap-2">
                {link.label}
                {link.href === "/cart" && cartCount > 0 ? (
                  <span className="min-w-[22px] h-[22px] inline-flex items-center justify-center rounded-full bg-brand-coral text-white text-[11px] font-bold">
                    {cartCount}
                  </span>
                ) : null}
              </span>
              <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-coral-sunset group-hover:w-full transition-all duration-300 rounded-full"></span>
            </Link>
          ))}
          {/* User Profile / Logout Section */}
          <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    {user.name || user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200 flex items-center gap-1"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
      {open && (
        <nav className="md:hidden bg-white border-t border-border-subtle animate-in">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm font-semibold">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="py-2 px-2 rounded-lg text-ink hover:bg-page hover:text-brand transition-colors duration-200"
                onClick={() => setOpen(false)}
              >
                <span className="inline-flex items-center gap-2">
                  {link.label}
                  {link.href === "/cart" && cartCount > 0 ? (
                    <span className="min-w-[22px] h-[22px] inline-flex items-center justify-center rounded-full bg-brand-coral text-white text-[11px] font-bold">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
            {user && (
              <>
                <div className="border-t border-gray-200 my-2 pt-2">
                  <div className="flex items-center gap-2 px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <span className="text-sm text-gray-700">
                      {user.name || user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 px-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center gap-2 justify-start font-medium"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
