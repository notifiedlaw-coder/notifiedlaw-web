"use client";

import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";
const KEY = "nl-theme";

function apply(t: Theme) {
  const el = document.documentElement;
  el.dataset.theme = t;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage, read once on mount
      if (v === "light" || v === "dark" || v === "system") setThemeState(v);
    } catch {}
  }, []);
  const setTheme = (t: Theme) => {
    setThemeState(t);
    apply(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
  };
  return { theme, setTheme };
}

/** Toolbar button: flips between light and dark from whatever is showing now. */
export function ThemeToggle() {
  const { setTheme } = useTheme();
  const flip = () => {
    const t = document.documentElement.dataset.theme;
    const dark = t === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : t === "dark";
    setTheme(dark ? "light" : "dark");
  };
  return (
    <button onClick={flip} aria-label="Toggle light or dark mode" title="Light / dark"
      className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-edge/5">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
      </svg>
    </button>
  );
}
