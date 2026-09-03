"use client";

import * as React from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "finapp-theme";

/**
 * Script inline que se ejecuta antes del primer paint:
 * aplica la clase .dark según localStorage o preferencia del sistema
 * para evitar el flash de tema incorrecto.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

/* Store externo: la fuente de verdad es la clase .dark en <html>,
   ya aplicada por el script inline antes de la hidratación. */

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = (event: MediaQueryListEvent) => {
    // Sin preferencia guardada, seguir al sistema
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored !== "dark" && stored !== "light") {
      document.documentElement.classList.toggle("dark", event.matches);
      document.documentElement.style.colorScheme = event.matches
        ? "dark"
        : "light";
    }
    listener();
  };
  media.addEventListener("change", handleSystemChange);
  window.addEventListener("storage", notify);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", handleSystemChange);
    window.removeEventListener("storage", notify);
  };
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  document.documentElement.style.colorScheme = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // localStorage no disponible: el tema se aplica solo en esta sesión
  }
  notify();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const value = React.useMemo(
    () => ({ theme, setTheme: applyTheme }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}
