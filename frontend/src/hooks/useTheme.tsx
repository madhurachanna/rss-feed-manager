import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark" | "aurora" | "sunset" | "midnight" | "everforest-dark" | "everforest-light";
export type AccentKey = "indigo" | "teal" | "rose" | "amber" | "violet" | "emerald" | "everforest" | "everforest-light";
type ThemeMode = "light" | "dark";

export type ThemePreset = {
  key: Theme;
  label: string;
  mode: ThemeMode;
  palette: { from: string; to: string };
  preview: { from: string; to: string; accent: string; surface: string };
  surfaces: { base: string; elevated: string; border: string; muted: string };
  accent?: AccentKey;
};

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  accent: AccentKey;
  setAccent: (accent: AccentKey) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

const STORAGE_KEY = "reader:theme";
const FONT_KEY = "reader:font";
const FONT_SIZE_KEY = "reader:fontSize";
const ACCENT_KEY = "reader:accent";

export const ACCENTS: Record<AccentKey, { primary: string; hover: string; soft: string }> = {
  indigo: { primary: "#6366F1", hover: "#4F46E5", soft: "#E0E7FF" },
  teal: { primary: "#14B8A6", hover: "#0F766E", soft: "#CCFBF1" },
  rose: { primary: "#F43F5E", hover: "#E11D48", soft: "#FFE4E6" },
  amber: { primary: "#F59E0B", hover: "#D97706", soft: "#FEF3C7" },
  violet: { primary: "#8B5CF6", hover: "#7C3AED", soft: "#EDE9FE" },
  emerald: { primary: "#10B981", hover: "#059669", soft: "#D1FAE5" },
  // Everforest palette - https://github.com/sainnhe/everforest
  everforest: { primary: "#A7C080", hover: "#83C092", soft: "#425047" },
  "everforest-light": { primary: "#8DA101", hover: "#93B259", soft: "#F0F1D2" },
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "light",
    label: "Light",
    mode: "light",
    palette: { from: "#f6f8fb", to: "#f9fafb" },
    preview: { from: "#f6f8fb", to: "#f9fafb", accent: ACCENTS.indigo.primary, surface: "#f8fafc" },
    surfaces: { base: "#ffffff", elevated: "#f8fafc", border: "#e2e8f0", muted: "#f1f5f9" },
  },
  {
    key: "dark",
    label: "Dark",
    mode: "dark",
    palette: { from: "#0b1220", to: "#0d1424" },
    preview: { from: "#0b1220", to: "#0d1424", accent: ACCENTS.indigo.primary, surface: "#0f172a" },
    surfaces: { base: "#0f172a", elevated: "#111827", border: "#1f2937", muted: "#0b1220" },
  },
  {
    key: "aurora",
    label: "Aurora",
    mode: "light",
    palette: { from: "#ecfdf5", to: "#e0f2fe" },
    preview: { from: "#ecfdf5", to: "#e0f2fe", accent: ACCENTS.teal.primary, surface: "#f2fffb" },
    surfaces: { base: "#f5fffb", elevated: "#f2fffb", border: "#ccfbf1", muted: "#ecfdf5" },
    accent: "teal",
  },
  {
    key: "sunset",
    label: "Sunset",
    mode: "light",
    palette: { from: "#fff7ed", to: "#ffe4e6" },
    preview: { from: "#fff7ed", to: "#ffe4e6", accent: ACCENTS.amber.primary, surface: "#fff5e7" },
    surfaces: { base: "#fffaf3", elevated: "#fff5e7", border: "#fed7aa", muted: "#fff7ed" },
    accent: "amber",
  },
  {
    key: "midnight",
    label: "Midnight",
    mode: "dark",
    palette: { from: "#0b0f24", to: "#1a1433" },
    preview: { from: "#0b0f24", to: "#1a1433", accent: ACCENTS.violet.primary, surface: "#0f122a" },
    surfaces: { base: "#0f122a", elevated: "#141738", border: "#22264a", muted: "#0b0f24" },
    accent: "violet",
  },
  // Everforest themes - https://github.com/sainnhe/everforest
  {
    key: "everforest-dark",
    label: "Everforest Dark",
    mode: "dark",
    palette: { from: "#232A2E", to: "#2D353B" },
    preview: { from: "#232A2E", to: "#2D353B", accent: ACCENTS.everforest.primary, surface: "#343F44" },
    surfaces: { base: "#2D353B", elevated: "#343F44", border: "#475258", muted: "#232A2E" },
    accent: "everforest",
  },
  {
    key: "everforest-light",
    label: "Everforest Light",
    mode: "light",
    palette: { from: "#EFEBD4", to: "#FDF6E3" },
    preview: { from: "#EFEBD4", to: "#FDF6E3", accent: ACCENTS["everforest-light"].primary, surface: "#F4F0D9" },
    surfaces: { base: "#FDF6E3", elevated: "#F4F0D9", border: "#E6E2CC", muted: "#EFEBD4" },
    accent: "everforest-light",
  },
];

const isThemeKey = (value: string | null): value is Theme => {
  if (!value) return false;
  return THEME_PRESETS.some((preset) => preset.key === value);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeKey(stored) ? stored : "light";
  });
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem(FONT_KEY) || "Inter");
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem(FONT_SIZE_KEY)) || 16);
  const [accent, setAccent] = useState<AccentKey>(() => (localStorage.getItem(ACCENT_KEY) as AccentKey) || "indigo");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    const preset = THEME_PRESETS.find((item) => item.key === theme) ?? THEME_PRESETS[0];
    const isDark = preset.mode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty("--page-bg-start", preset.palette.from);
    document.documentElement.style.setProperty("--page-bg-end", preset.palette.to);
    document.documentElement.style.setProperty("--surface", preset.surfaces.base);
    document.documentElement.style.setProperty("--surface-elevated", preset.surfaces.elevated);
    document.documentElement.style.setProperty("--surface-border", preset.surfaces.border);
    document.documentElement.style.setProperty("--surface-muted", preset.surfaces.muted);
    const themeColorTag = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (themeColorTag) {
      themeColorTag.setAttribute("content", preset.palette.from);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(FONT_KEY, fontFamily);
    document.body.style.fontFamily = fontFamily;
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
    document.documentElement.style.setProperty("font-size", `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(ACCENT_KEY, accent);
    const palette = ACCENTS[accent] || ACCENTS.indigo;
    document.documentElement.style.setProperty("--accent", palette.primary);
    document.documentElement.style.setProperty("--accent-hover", palette.hover);
    document.documentElement.style.setProperty("--accent-soft", palette.soft);
  }, [accent]);

  const value = useMemo(
    () => ({ theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, accent, setAccent }),
    [theme, fontFamily, fontSize, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
