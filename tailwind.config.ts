import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // ============ PYRALIS LUMEN v2 ============
        lumen: {
          // Surfaces
          canvas: { light: "#FAFAF9", dark: "#0A0A0B" },
          surface: { light: "#FFFFFF", dark: "#16161A" },
          raised: { light: "#F5F5F4", dark: "#1C1C22" },
          border: { light: "#E7E5E4", dark: "#27272E" },
          borderStrong: { light: "#D6D3D1", dark: "#3A3A45" },

          // Ink (text)
          ink: { light: "#0C0A09", dark: "#FAFAF9" },
          inkMuted: { light: "#57534E", dark: "#A8A29E" },
          inkSubtle: { light: "#A8A29E", dark: "#57534E" },

          // Accents (mantenidos de v1)
          glow: "#FBBF24",
          glowHover: "#F59E0B",
          glowSoft: { light: "#FEF3C7", dark: "#3B2E0C" },
          ember: "#F97316",
          emberSoft: { light: "#FFEDD5", dark: "#3B1F0C" },

          // Nuevos en v2 — semánticos refinados
          aurora: "#A78BFA",   // IA / pensamiento
          tide: "#5EEAD4",     // Conexiones, integraciones
          pulse: "#34D399",    // Success refinado
          flag: "#F87171",     // Danger refinado
          tag: "#60A5FA",      // Info
        },

        // ============ Pyralis v1 (retro-compatibilidad) ============
        pyralis: {
          midnight: "#0F172A",
          midnightSoft: "#1E293B",
          glow: "#FBBF24",
          glowHover: "#F59E0B",
          glowSoft: "#FEF3C7",
          ember: "#F97316",
          emberSoft: "#FED7AA",
          success: "#10B981",
          successSoft: "#D1FAE5",
          warning: "#F59E0B",
          warningSoft: "#FEF3C7",
          danger: "#EF4444",
          dangerSoft: "#FEE2E2",
          info: "#3B82F6",
          infoSoft: "#DBEAFE",
        },

        // ============ TOKENS SEMÁNTICOS (shadcn-like) ============
        border: "hsl(214, 32%, 91%)",
        input: "hsl(214, 32%, 91%)",
        ring: "hsl(38, 92%, 50%)",
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(222, 47%, 11%)",
        primary: { DEFAULT: "#0F172A", foreground: "#F8FAFC" },
        secondary: { DEFAULT: "hsl(210, 40%, 96%)", foreground: "hsl(222, 47%, 11%)" },
        destructive: { DEFAULT: "#EF4444", foreground: "#F8FAFC" },
        muted: { DEFAULT: "hsl(210, 40%, 96%)", foreground: "hsl(215, 16%, 47%)" },
        accent: { DEFAULT: "#FBBF24", foreground: "#0F172A" },
        popover: { DEFAULT: "hsl(0, 0%, 100%)", foreground: "hsl(222, 47%, 11%)" },
        card: { DEFAULT: "hsl(0, 0%, 100%)", foreground: "hsl(222, 47%, 11%)" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-geist)", "var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        // ============ Pyralis Lumen v2 ============
        "lumen-hero": ["64px", { lineHeight: "72px", letterSpacing: "-0.05em", fontWeight: "700" }],
        "lumen-display-xl": ["48px", { lineHeight: "56px", letterSpacing: "-0.04em", fontWeight: "700" }],
        "lumen-display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "lumen-display-md": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "lumen-display-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "lumen-body-lg": ["18px", { lineHeight: "28px" }],
        "lumen-body": ["15px", { lineHeight: "24px" }],
        "lumen-body-sm": ["13px", { lineHeight: "20px" }],
        "lumen-caption": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "lumen-overline": ["11px", { lineHeight: "14px", letterSpacing: "0.1em", fontWeight: "600" }],
        "lumen-mono": ["13px", { lineHeight: "20px", fontWeight: "500" }],
        "lumen-mono-display": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],

        // ============ Legacy v1 ============
        "display-xl": ["56px", { lineHeight: "64px", letterSpacing: "-0.04em", fontWeight: "800" }],
        "display-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-md": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-sm": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px" }],
        "body": ["16px", { lineHeight: "24px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        "caption": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "overline": ["11px", { lineHeight: "14px", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      borderRadius: {
        // ============ Lumen ============
        "lumen-xs": "4px",
        "lumen-sm": "8px",
        "lumen": "12px",
        "lumen-lg": "16px",
        "lumen-xl": "24px",
        // ============ Legacy ============
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
      },
      boxShadow: {
        // ============ Lumen v2 ============
        "lumen-1": "0 1px 2px rgba(12, 10, 9, 0.04)",
        "lumen-2": "0 4px 12px rgba(12, 10, 9, 0.06), 0 1px 2px rgba(12, 10, 9, 0.04)",
        "lumen-3": "0 16px 32px rgba(12, 10, 9, 0.08)",
        "lumen-glow": "0 0 0 1px rgba(251, 191, 36, 0.3), 0 0 32px rgba(251, 191, 36, 0.15)",
        "lumen-aurora": "0 0 0 1px rgba(167, 139, 250, 0.3), 0 0 40px rgba(167, 139, 250, 0.2)",
        "lumen-pulse": "0 0 0 1px rgba(52, 211, 153, 0.3), 0 0 24px rgba(52, 211, 153, 0.15)",
        // Dark mode versions
        "lumen-1-dark": "0 1px 2px rgba(0, 0, 0, 0.4)",
        "lumen-2-dark": "0 4px 12px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4)",
        "lumen-3-dark": "0 16px 32px rgba(0, 0, 0, 0.6)",

        // ============ Legacy v1 ============
        "pyralis-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
        "pyralis": "0 4px 12px rgba(15, 23, 42, 0.08)",
        "pyralis-lg": "0 12px 32px rgba(15, 23, 42, 0.12)",
        "pyralis-glow": "0 0 24px rgba(251, 191, 36, 0.25)",
      },
      backgroundImage: {
        // ============ Gradientes signature Lumen ============
        "lumen-glow": "linear-gradient(135deg, #FBBF24 0%, #F97316 100%)",
        "lumen-aurora": "linear-gradient(135deg, #A78BFA 0%, #60A5FA 50%, #5EEAD4 100%)",
        "lumen-night": "linear-gradient(180deg, #16161A 0%, #0A0A0B 100%)",
        "lumen-dawn": "linear-gradient(180deg, #1C1C22 0%, #16161A 100%)",
        "lumen-ember-fade": "radial-gradient(circle at top right, rgba(249,115,22,0.15) 0%, transparent 60%)",
        "lumen-aurora-fade": "radial-gradient(circle at bottom left, rgba(167,139,250,0.18) 0%, transparent 70%)",
        "lumen-mesh": `radial-gradient(at 20% 20%, rgba(251,191,36,0.12) 0px, transparent 50%),
                       radial-gradient(at 80% 30%, rgba(249,115,22,0.10) 0px, transparent 50%),
                       radial-gradient(at 70% 80%, rgba(167,139,250,0.10) 0px, transparent 50%)`,
      },
      transitionTimingFunction: {
        "lumen-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "lumen-in-out": "cubic-bezier(0.83, 0, 0.17, 1)",
        "lumen-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        "instant": "100ms",
        "fast": "200ms",
        "deliberate": "700ms",
      },
      keyframes: {
        // Lumen v2
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0.5)" },
          "50%": { boxShadow: "0 0 0 12px rgba(251, 191, 36, 0)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "aurora-flow": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
        // Legacy
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // Lumen v2
        "shimmer": "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "aurora-flow": "aurora-flow 6s ease-in-out infinite",
        "orb-float": "orb-float 20s ease-in-out infinite",
        // Legacy
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
      backdropBlur: {
        "lumen": "16px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
