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
