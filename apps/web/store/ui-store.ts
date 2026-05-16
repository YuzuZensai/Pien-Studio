"use client";

import { create } from "zustand";

export type AppTheme = "light" | "dark" | "system";
export type AppLocale = "en" | "th" | "ja";

const THEME_KEY = "pien.ui.theme";
const LOCALE_KEY = "pien.ui.locale";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  const value = window.localStorage.getItem(THEME_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

function readLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  const value = window.localStorage.getItem(LOCALE_KEY);
  if (value === "th" || value === "ja" || value === "en") return value;
  return "en";
}

function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function isDarkTheme(theme: AppTheme): boolean {
  return theme === "system" ? getSystemTheme() === "dark" : theme === "dark";
}

type UiState = {
  theme: AppTheme;
  locale: AppLocale;
  hydrate: () => void;
  setTheme: (theme: AppTheme) => void;
  setLocale: (locale: AppLocale) => void;
};

export const useUiStore = create<UiState>((set) => ({
  theme: "light",
  locale: "en",
  hydrate: () => {
    const theme = readTheme();
    const locale = readLocale();
    applyTheme(theme);
    set((state) => {
      if (state.theme === theme && state.locale === locale) return state;
      return { theme, locale };
    });
  },
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, theme);
    }
    applyTheme(theme);
    set({ theme });
  },
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_KEY, locale);
    }
    set({ locale });
  },
}));
