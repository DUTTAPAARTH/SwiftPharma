import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login, signup } from "../../services/authService";
import { AuthContext } from "../../context/AuthContext";

const featureCards = [
  {
    icon: "medication",
    title: "Prescriptions",
    text: "Upload, review, and reorder without friction.",
  },
  {
    icon: "inventory_2",
    title: "Orders",
    text: "Track stock and delivery progress from one place.",
  },
  {
    icon: "verified_user",
    title: "Access",
    text: "Shared login with automatic role-based routing.",
  },
];

export default function AuthForm({ mode = "login" }) {
  const navigate = useNavigate();
  const { login: setAuthUser } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(mode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCredentials = localStorage.getItem("rememberedCredentials");
      if (savedCredentials) {
        try {
          const { email, password } = JSON.parse(savedCredentials);
          setFormData((prev) => ({
            ...prev,
            email: email || "",
            password: password || "",
          }));
          setRememberMe(true);
        } catch (loadError) {
          console.error("Error loading saved credentials:", loadError);
        }
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const response = await login({
          email: formData.email,
          password: formData.password,
          rememberMe,
        });

        if (response.success) {
          const authToken =
            response.token ||
            response.user?.token ||
            `auth-token-${Date.now()}`;

          setAuthUser(response.user, authToken);

          const nextPath = ["admin", "pharmacist"].includes(
            String(response?.user?.role || "").toLowerCase(),
          )
            ? "/admin"
            : "/home";

          if (rememberMe) {
            localStorage.setItem(
              "rememberedCredentials",
              JSON.stringify({
                email: formData.email,
                password: formData.password,
              }),
            );
          } else {
            localStorage.removeItem("rememberedCredentials");
          }

          setSuccess(true);
          setTimeout(() => navigate(nextPath), 900);
        } else {
          setError(response.message || "Login failed. Please try again.");
        }
      } else {
        if (!formData.name) {
          setError("Name is required");
          setLoading(false);
          return;
        }

        const response = await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        });

        if (response.success) {
          const authToken =
            response.token ||
            response.user?.token ||
            `auth-token-${Date.now()}`;

          setAuthUser(response.user, authToken);
          setSuccess(true);
          setTimeout(() => navigate("/home"), 900);
        } else {
          setError(response.message || "Signup failed. Please try again.");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950"
      onMouseMove={(e) => {
        const x = (e.clientX / window.innerWidth) * 20 - 10;
        const y = (e.clientY / window.innerHeight) * 20 - 10;
        setParallax({ x, y });
      }}
      onMouseLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at top left, rgba(34, 197, 94, 0.12), transparent 28%),
            radial-gradient(circle at top right, rgba(56, 189, 248, 0.2), transparent 30%),
            linear-gradient(135deg, #020617 0%, #0f172a 45%, #082f49 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, rgba(255,255,255,0.02) 0%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 100%)",
        }}
      />
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <img
          src="/assets/doctor.svg"
          alt="Doctor silhouette"
          aria-hidden="true"
          className="doctor-float absolute bottom-0 left-[2%] h-auto w-72 select-none opacity-15 transition-transform duration-200 xl:w-[24vw]"
          style={{
            transform: `translate(${parallax.x * 0.28}px, ${parallax.y * 0.28}px)`,
          }}
        />
        <img
          src="/assets/nurse.svg"
          alt="Nurse silhouette"
          aria-hidden="true"
          className="nurse-float absolute bottom-0 right-[2%] h-auto w-72 select-none opacity-15 transition-transform duration-200 xl:w-[24vw]"
          style={{
            transform: `translate(${-parallax.x * 0.28}px, ${parallax.y * 0.28}px)`,
          }}
        />
      </div>

      <svg
        className="absolute left-0 top-[16%] hidden h-24 w-full opacity-30 lg:block"
        viewBox="0 0 1200 120"
        fill="none"
      >
        <path
          d="M0 60 L150 60 L200 20 L260 100 L320 60 L1200 60"
          stroke="#38bdf8"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 10"
          className="ecg-line"
        />
      </svg>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="order-2 text-white lg:order-1">
            <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8 lg:p-10">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_hospital
                </span>
                Trusted pharmacy access
              </div>

              <h1 className="max-w-lg text-4xl font-black tracking-tight text-white sm:text-5xl">
                SwiftPharma keeps medicine access fast, clear, and secure.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Sign in to manage prescriptions, place orders, and track every
                update from one place. Admin and pharmacist accounts continue
                through the same login flow automatically.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {featureCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-slate-950/30 p-4"
                  >
                    <span
                      className="material-symbols-outlined mb-3 text-2xl text-cyan-300"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {item.icon}
                    </span>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`order-1 lg:order-2 ${
              success ? "scale-110 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <div
              className="mx-auto w-full max-w-md overflow-hidden rounded-[32px] border border-white/70 bg-white/96 shadow-[0_30px_90px_rgba(2,6,23,0.28)] backdrop-blur-xl transition-all duration-500"
              style={{
                transform: success
                  ? "scale(1.1)"
                  : `translate(${parallax.x * 0.16}px, ${parallax.y * 0.16}px)`,
              }}
            >
              <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#0f3b5f_55%,#14b8a6_100%)] px-8 pb-8 pt-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                    <span
                      className="material-symbols-outlined text-2xl text-white"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      medical_services
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100/80">
                      SwiftPharma
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      {isLogin ? "Welcome back" : "Create your account"}
                    </h2>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-100/85">
                  {isLogin
                    ? "Use your account to continue to your dashboard or admin workspace."
                    : "Set up your account to start ordering and managing prescriptions."}
                </p>
              </div>

              <div className="border-b border-slate-200 bg-slate-50 px-8 pt-4">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {["Login", "Sign Up"].map((tab, i) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setIsLogin(i === 0);
                        setError("");
                      }}
                      aria-label={
                        i === 0 ? "Switch to login tab" : "Switch to signup tab"
                      }
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                        (i === 0 ? isLogin : !isLogin)
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white px-8 pb-8 pt-6">
                {error && (
                  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                    <span
                      className="material-symbols-outlined mt-0.5 flex-shrink-0 text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      error
                    </span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {!isLogin && (
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                        person
                      </span>
                      <input
                        type="text"
                        name="name"
                        placeholder="Full name"
                        value={formData.name}
                        onChange={handleChange}
                        required={!isLogin}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                      email
                    </span>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  {!isLogin && (
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                        phone
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                      lock
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {isLogin && (
                    <label className="flex cursor-pointer items-center gap-2.5 py-1 select-none">
                      <div
                        className={`flex size-5 items-center justify-center rounded-md border-2 transition-all ${
                          rememberMe
                            ? "border-primary bg-primary"
                            : "border-slate-300 hover:border-primary/50"
                        }`}
                        onClick={() => setRememberMe(!rememberMe)}
                      >
                        {rememberMe && (
                          <span
                            className="material-symbols-outlined text-white"
                            style={{
                              fontSize: "14px",
                              fontVariationSettings: "'FILL' 1",
                            }}
                          >
                            check
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        Remember me
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    aria-label={
                      isLogin ? "Submit login form" : "Submit signup form"
                    }
                    disabled={loading}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="size-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        {isLogin ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      <>
                        <span
                          className="material-symbols-outlined text-base"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {isLogin ? "login" : "person_add"}
                        </span>
                        {isLogin ? "Sign In" : "Create Account"}
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs leading-6 text-slate-500">
                  By continuing, you agree to our{" "}
                  <a
                    href="/terms"
                    className="font-semibold text-primary hover:underline"
                  >
                    Terms
                  </a>
                  {" and "}
                  <a
                    href="/privacy"
                    className="font-semibold text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
