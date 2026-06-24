/**
 * Tailwind config for the FinPilot app. Pulls the shared design-system preset
 * from `@finpilot/ui` and scans both the app source and the UI package (since
 * those components carry the `className`s Tailwind must see).
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind requires its own preset alongside the design-system preset.
  presets: [
    require("nativewind/preset"),
    require("@finpilot/ui/tailwind-preset"),
  ],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
