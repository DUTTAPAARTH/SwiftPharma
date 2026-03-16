export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#13b6ec",
        "primary-hover": "#0891b2",
        secondary: "#0f172a",
        accent: "#14b8a6",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        "background-light": "#f4f7fb",
        "background-dark": "#081123",
        page: "#f4f7fb",
        surface: "#ffffff",
        ink: "#0f172a",
        "ink-soft": "#475569",
        "ink-muted": "#94a3b8",
        card: "#ffffff",
        border: "#d9e3f0",
        "border-subtle": "#e6edf5",
        brand: "#13b6ec",
        "brand-dark": "#0891b2",
        brown: "#0f172a",
      },
      fontFamily: {
        "nexus-bold": ["Sora", "system-ui", "sans-serif"],
        mergian: ["IBM Plex Sans", "system-ui", "sans-serif"],
        roserri: ["IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["Sora", "system-ui", "sans-serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #13b6ec 0%, #0ea5d9 45%, #14b8a6 100%)",
        "gradient-page":
          "radial-gradient(circle at top left, rgba(19,182,236,0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(20,184,166,0.12), transparent 28%), linear-gradient(180deg, #f4f7fb 0%, #eef5fb 100%)",
        "gradient-dark-page":
          "radial-gradient(circle at top left, rgba(19,182,236,0.2), transparent 30%), radial-gradient(circle at bottom right, rgba(20,184,166,0.18), transparent 22%), linear-gradient(180deg, #081123 0%, #0d182e 100%)",
        "gradient-panel":
          "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88))",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.06)",
        card: "0 18px 44px rgba(15, 23, 42, 0.08)",
        lifted: "0 28px 64px rgba(15, 23, 42, 0.12)",
        glow: "0 18px 40px rgba(19, 182, 236, 0.22)",
        "glow-blue": "0 18px 40px rgba(14, 165, 233, 0.22)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.8s infinite linear",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
        gradientSlow: "gradientSlow 14s ease infinite",
        fadeIn: "fadeIn 0.45s ease-out forwards",
        slideUp: "slideUp 0.6s ease-out forwards",
        scaleIn: "scaleIn 0.5s ease-out forwards",
        doctorFloat: "doctorFloat 6s ease-in-out infinite",
        nurseFloat: "nurseFloat 7.5s ease-in-out infinite",
        ecg: "ecg 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.72" },
          "50%": { opacity: "1" },
        },
        gradientSlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.97)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        doctorFloat: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        nurseFloat: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        ecg: {
          "0%": { strokeDashoffset: 0 },
          "100%": { strokeDashoffset: -100 },
        },
      },
      backgroundSize: {
        "300%": "300% 300%",
      },
      scale: {
        103: "1.03",
        105: "1.05",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
