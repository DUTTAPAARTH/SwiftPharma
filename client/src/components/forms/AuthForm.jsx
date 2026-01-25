import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login, signup } from "../../services/authService";
import { AuthContext } from "../../context/AuthContext";

export default function AuthForm({ mode = "login" }) {
  const navigate = useNavigate();
  const { login: setAuthUser } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(mode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials
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
        } catch (error) {
          console.error("Error loading saved credentials:", error);
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
        // Login with rememberMe flag
        const response = await login({
          email: formData.email,
          password: formData.password,
          rememberMe: rememberMe,
        });

        console.log("📋 Login response in AuthForm:", response);
        console.log("📋 Response success:", response.success);
        console.log("📋 Response token:", response.token);

        if (response.success) {
          // Update AuthContext with user data and token
          const authToken =
            response.token ||
            response.user?.token ||
            "auth-token-" + Date.now();
          console.log("✅ Setting auth user with token:", authToken);
          setAuthUser(response.user, authToken);

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
          console.log("✅ Login successful, redirecting to dashboard");
          setTimeout(() => navigate("/dashboard"), 900);
        } else {
          console.error("❌ Login failed - response.success is false");
          setError(response.message || "Login failed. Please try again.");
        }
      } else {
        // Signup
        if (!formData.name) {
          setError("Name is required");
          setLoading(false);
          return;
        }

        console.log("📝 Attempting signup with:", {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });
        const response = await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        });

        console.log("📝 Signup response:", response);

        if (response.success) {
          console.log("✅ Signup successful!");
          // Update AuthContext with user data and token
          const authToken =
            response.token || response.user.token || "auth-token-" + Date.now();
          setAuthUser(response.user, authToken);
          setSuccess(true);
          setTimeout(() => navigate("/dashboard"), 900);
        } else {
          console.error("❌ Signup failed - response.success is false");
          setError(response.message || "Signup failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f8fbff]"
      onMouseMove={(e) => {
        const x = (e.clientX / window.innerWidth) * 20 - 10;
        const y = (e.clientY / window.innerHeight) * 20 - 10;
        setParallax({ x, y });
      }}
      onMouseLeave={() => setParallax({ x: 0, y: 0 })}
    >
      {/* Animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-emerald-100 bg-300% animate-gradientSlow" />

      {/* Doctor / Nurse SVG silhouettes with parallax */}
      <div className="pointer-events-none absolute inset-0">
        {/* Left silhouette - Doctor */}
        <img
          src="/assets/doctor.svg"
          alt="Doctor silhouette"
          aria-hidden="true"
          className="doctor-float absolute left-[3%] bottom-0 opacity-40
                     w-32 sm:w-40 md:w-56 lg:w-72 xl:w-[26vw]
                     h-auto select-none transition-transform duration-200"
          style={{
            transform: `translate(${parallax.x * 0.3}px, ${
              parallax.y * 0.3
            }px)`,
          }}
        />
        {/* Right silhouette - Nurse */}
        <img
          src="/assets/nurse.svg"
          alt="Nurse silhouette"
          aria-hidden="true"
          className="nurse-float absolute right-[3%] bottom-0 opacity-40
                     w-32 sm:w-40 md:w-56 lg:w-72 xl:w-[26vw]
                     h-auto select-none transition-transform duration-200"
          style={{
            transform: `translate(${-parallax.x * 0.3}px, ${
              parallax.y * 0.3
            }px)`,
          }}
        />
      </div>

      {/* ECG heartbeat line */}
      <svg
        className="absolute top-[20%] left-0 w-full h-24 opacity-20"
        viewBox="0 0 1200 120"
        fill="none"
      >
        <path
          d="M0 60 L150 60 L200 20 L260 100 L320 60 L1200 60"
          stroke="#10b981"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 10"
          className="ecg-line"
        />
      </svg>

      {/* Login/Signup Card with breathing animation */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div
          className={`login-card w-full max-w-md rounded-3xl bg-white p-8 shadow-xl transition-all duration-700 ${
            success ? "scale-110 opacity-0" : "scale-100 opacity-100"
          }`}
          style={{
            transform: success
              ? "scale(1.1)"
              : `translate(${parallax.x * 0.2}px, ${parallax.y * 0.2}px)`,
            animation: success ? "none" : "cardBreath 5s ease-in-out infinite",
          }}
        >
          <h1 className="text-3xl font-bold text-gray-800">SwiftPharma</h1>
          <p className="mt-1 mb-6 text-sm text-gray-500">
            {isLogin ? "Secure login to continue" : "Create your account"}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
                className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mb-4 w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-200"
            />

            {!isLogin && (
              <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={handleChange}
                className="mb-4 w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-200"
              />
            )}

            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 py-3 text-white font-semibold hover:scale-[1.03] active:scale-[0.95] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                  ? "Login"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {isLogin ? (
              <>
                Don’t have an account?{" "}
                <button
                  type="button"
                  className="text-blue-600 font-medium"
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-blue-600 font-medium"
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
