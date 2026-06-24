/**
 * Design tokens for the FinPilot UI.
 *
 * A distinctive "ink & mint" system: warm near-black inks instead of pure grey,
 * a confident emerald→mint primary, and amber / rose / sky for income-positive,
 * spend-warning, and informational accents. Tuned for a finance app — calm,
 * legible, with a single saturated accent so money figures read as the hero.
 *
 * These literals are the single source of truth; the Tailwind preset
 * (`tailwind-preset.js`) mirrors them so `className` strings and inline JS both
 * resolve to the same palette.
 */

/** Raw color ramp. Hex strings, no opacity baked in. */
export const palette = {
  // Brand — emerald that leans mint at the light end.
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
  // Ink — warm near-blacks for surfaces (a hint of green keeps it from feeling cold).
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
  // Semantic accents.
  amber: { 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
  rose: { 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c" },
  sky: { 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1" },
  violet: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9" },
} as const;

/**
 * Semantic theme — the names components reference. Two concrete themes
 * (light/dark) selected at runtime by the ThemeProvider.
 */
export interface Theme {
  /** App background. */
  background: string;
  /** Card / raised surface. */
  card: string;
  /** Subtle inset surface (inputs, wells). */
  muted: string;
  /** Primary text. */
  foreground: string;
  /** Secondary text. */
  mutedForeground: string;
  /** Hairline borders. */
  border: string;
  /** Brand primary + its on-color. */
  primary: string;
  primaryForeground: string;
  /** Income / positive. */
  positive: string;
  /** Expense / warning. */
  warning: string;
  /** Danger / over-budget. */
  danger: string;
  /** Informational. */
  info: string;
  /** Accent for chart variety. */
  accent: string;
}

export const lightTheme: Theme = {
  background: palette.ink[50],
  card: palette.ink[0],
  muted: palette.ink[100],
  foreground: palette.ink[900],
  mutedForeground: palette.ink[500],
  border: palette.ink[200],
  primary: palette.mint[600],
  primaryForeground: palette.ink[0],
  positive: palette.mint[600],
  warning: palette.amber[600],
  danger: palette.rose[600],
  info: palette.sky[600],
  accent: palette.violet[600],
};

export const darkTheme: Theme = {
  background: palette.ink[950],
  card: palette.ink[900],
  muted: palette.ink[800],
  foreground: palette.ink[50],
  mutedForeground: palette.ink[400],
  border: palette.ink[700],
  primary: palette.mint[400],
  primaryForeground: palette.ink[950],
  positive: palette.mint[400],
  warning: palette.amber[400],
  danger: palette.rose[400],
  info: palette.sky[400],
  accent: palette.violet[400],
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
export type ThemeName = keyof typeof themes;

/** Spacing scale (px). 4-pt grid. */
export const spacing = {
  px: 1,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Corner radii (px). Generous, friendly. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  "2xl": 28,
  full: 9999,
} as const;

/** Type scale (px) + line heights. */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "700" as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
  mono: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const },
} as const;

/**
 * An ordered palette for charts — primary first, then distinct hues that read
 * well on both ink and paper backgrounds. Used by the donut / bar / line charts.
 */
export const chartPalette = [
  palette.mint[500],
  palette.sky[500],
  palette.violet[500],
  palette.amber[500],
  palette.rose[500],
  palette.mint[700],
  palette.sky[700],
  palette.violet[700],
  palette.amber[600],
  palette.rose[600],
] as const;
