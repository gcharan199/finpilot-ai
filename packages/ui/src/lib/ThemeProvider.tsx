import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "nativewind";
import { darkTheme, lightTheme, type Theme, type ThemeName } from "../theme/tokens";

/**
 * Theme context.
 *
 * NativeWind owns the `dark` class (so `className` strings theme themselves).
 * This provider re-exposes the *resolved* token object + a setter, because Skia
 * and Victory render to a canvas and need concrete hex colors, not classes.
 */
export interface ThemeContextValue {
  /** Resolved theme name actually in effect ("light" | "dark"). */
  name: ThemeName;
  /** Concrete color tokens for canvas/imperative use. */
  colors: Theme;
  /** User preference, including "system". */
  preference: "light" | "dark" | "system";
  /** Set the preference; "system" follows the OS. */
  setPreference: (p: "light" | "dark" | "system") => void;
  /** Convenience flip between light/dark (drops "system"). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const name: ThemeName = colorScheme === "dark" ? "dark" : "light";
    const setPreference = (p: "light" | "dark" | "system") => setColorScheme(p);
    return {
      name,
      colors: name === "dark" ? darkTheme : lightTheme,
      // nativewind reports the *effective* scheme; we surface it as preference
      // too (the app persists the user's literal choice separately).
      preference: (colorScheme ?? "system") as "light" | "dark" | "system",
      setPreference,
      toggle: () => setColorScheme(name === "dark" ? "light" : "dark"),
    };
  }, [colorScheme, setColorScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the resolved theme. Throws if used outside a {@link ThemeProvider}. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
