export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        float: "float 6s ease-in-out infinite",
        gradient: "gradient 6s ease infinite",
        shimmer: "shimmer 1.5s infinite linear",
        pop: "pop 0.3s ease-out",
        slideUp: "slideUp 0.35s ease-out",
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        gradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pop: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      fontFamily: {
        "nexus-bold": ["Inter", "system-ui", "sans-serif"],
        mergian: ["Inter", "system-ui", "sans-serif"],
        roserri: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      colors: {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        primary: "#2563EB",
        primarySoft: "#EFF6FF",
        textPrimary: "#0F172A",
        textSecondary: "#475569",
        border: "#E2E8F0",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        "primary-text": "#0F172A",
        "secondary-text": "#475569",
        "text-strong": "#0F172A",
        "text-muted": "#475569",
        background: "#F8FAFC",
        "card-bg": "#FFFFFF",
        "card-surface": "#FFFFFF",
        border: "#E7E1DC",
        "brand-coral": "#FF6B4A",
        "brand-coral-dark": "#E3522D",
        "lavender-accent": "#9270FF",
        "accent-blue": "#3A78F2",
        brand: "#FF6B4A",
        "brand-dark": "#E3522D",
        ink: "#1F1C1A",
        "ink-soft": "#7B6C63",
        "ink-muted": "#9B8E83",
        page: "#F7F4EF",
        card: "#FFFFFF",
        "border-subtle": "#E7E1DC",
        info: "#3A78F2",
        brown: "#8B6F47",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #FF6B4A, #FF906A, #FFB199)",
        "gradient-hero":
          "linear-gradient(135deg, #FFF3EB, #FFE0D1 40%, #F9E1F7 100%)",
        "gradient-cta": "linear-gradient(to right, #FF6B4A, #FF906A)",
        "gradient-lavender":
          "linear-gradient(135deg, #9270FF 0%, #B89AFF 100%)",
        "gradient-special": "linear-gradient(135deg, #FFF1E9, #FFE2D2)",
        "gradient-warm-glow": "linear-gradient(135deg, #F7F4EF, #FFFFFF)",
      },
      boxShadow: {
        card: "0 6px 25px rgba(0, 0, 0, 0.06)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.04)",
        lifted: "0 12px 40px rgba(0, 0, 0, 0.08)",
        glow: "0 0 30px rgba(255, 107, 74, 0.15)",
        "glow-blue": "0 0 30px rgba(58, 120, 242, 0.15)",
      },
      transitionDuration: {
        200: "200ms",
        300: "300ms",
      },
      scale: {
        103: "1.03",
        105: "1.05",
      },
      letterSpacing: {
        tight: "-0.5px",
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundSize: {
        "300%": "300% 300%",
      },
      transitionDelay: {
        2000: "2000ms",
        3000: "3000ms",
        4000: "4000ms",
      },
      animation: {
        floatSlow: "floatSlow 10s ease-in-out infinite",
        floatUltra: "floatUltra 20s ease-in-out infinite",
        gradientSlow: "gradientSlow 14s ease infinite",
        scaleIn: "scaleIn 0.6s ease forwards",
        ecg: "ecg 2s linear infinite",
        fadeIn: "fadeIn 0.5s ease-in forwards",
        slideUp: "slideUp 0.6s ease-out forwards",
      },
      keyframes: {
        floatSlow: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-30px)" },
        },
        floatUltra: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-60px)" },
        },
        gradientSlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        ecg: {
          "0%": { strokeDashoffset: 0 },
          "100%": { strokeDashoffset: -100 },
        },
      },
    },
  },
  plugins: [],
};
