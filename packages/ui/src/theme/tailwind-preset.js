/**
 * Shared Tailwind preset for the FinPilot design system.
 *
 * Semantic colors resolve to CSS variables (set in `global.css` for the light
 * theme and overridden under `.dark`). This is the NativeWind v4 idiom: one
 * class name (`bg-card`, `text-primary`) works in both themes, and the variable
 * indirection keeps `tokens.ts` (JS) and the className palette in lockstep.
 *
 * The raw `mint`/`ink` ramps are also exposed for the rare case a fixed hue is
 * wanted regardless of theme.
 */

/** @type {(name: string) => string} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic — theme-aware via CSS variables.
        background: v("background"),
        card: v("card"),
        muted: v("muted"),
        "muted-foreground": v("muted-foreground"),
        foreground: v("foreground"),
        border: v("border"),
        primary: {
          DEFAULT: v("primary"),
          foreground: v("primary-foreground"),
        },
        positive: v("positive"),
        warning: v("warning"),
        danger: v("danger"),
        info: v("info"),
        accent: v("accent"),

        // Fixed brand ramps (theme-independent).
        mint: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        ink: {
          0: "#ffffff",
          50: "#f6f7f6",
          100: "#eceeec",
          200: "#d7dbd8",
          300: "#b3bab5",
          400: "#828b85",
          500: "#5c645e",
          600: "#3f4742",
          700: "#2a302c",
          800: "#1b201d",
          900: "#121613",
          950: "#0b0e0c",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "22px",
        "2xl": "28px",
      },
      fontSize: {
        display: ["34px", { lineHeight: "40px" }],
        caption: ["12px", { lineHeight: "16px" }],
      },
    },
  },
};
