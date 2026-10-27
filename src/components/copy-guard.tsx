"use client";

import { useEffect } from "react";

const isField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest("input, textarea, [contenteditable='true']");

// Deters casual copying. Cannot stop screenshots, screen recording or view-source.
export function CopyGuard() {
  useEffect(() => {
    const block = (e: Event) => { if (!isField(e.target)) e.preventDefault(); };
    const events = ["copy", "cut", "contextmenu", "dragstart"] as const;
    events.forEach((n) => document.addEventListener(n, block));
    return () => events.forEach((n) => document.removeEventListener(n, block));
  }, []);
  return null;
}
