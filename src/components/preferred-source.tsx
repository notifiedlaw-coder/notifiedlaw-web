"use client";

import { useEffect } from "react";
import { SITE } from "@/lib/site";

// Google's preferred sources library, in manual mode so it never scans the page for its own buttons.
const LIB = "https://news.google.com/swg/js/v1/publisher.js";
const DEEPLINK = `https://www.google.com/preferences/source?q=${new URL(SITE.url).hostname}`;

type Api = { init: (o: { theme?: "light" | "dark"; lang?: string }) => void; addPreferredSource: () => void };
declare global { interface Window { PREFERRED_SOURCE?: ((api: Api) => void)[] } }

let api: Api | null = null;

function load() {
  if (document.querySelector(`script[src="${LIB}"]`)) return;
  (window.PREFERRED_SOURCE ||= []).push((a) => {
    a.init({ theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light", lang: "en" });
    api = a;
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = LIB;
  s.setAttribute("preferred-sources-control", "manual");
  document.head.appendChild(s);
}

/**
 * Asks readers to add NotifiedLaw as a preferred source in Google Search. Opens Google's own flow once its
 * library has loaded; until then, or if it is blocked, the link goes to the source preferences page.
 */
export function PreferredSource({ className = "" }: { className?: string }) {
  useEffect(load, []);
  return (
    <a
      href={DEEPLINK}
      target="_blank"
      rel="noopener"
      onClick={(e) => { if (api) { e.preventDefault(); api.addPreferredSource(); } }}
      className={`inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-hover ${className}`}
      aria-label="Add NotifiedLaw as a preferred source on Google"
      style={{ textDecoration: "none" }}
    >
      <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
        <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.7 10.7l7.8-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
      </svg>
      <span className="sm:hidden">Preferred source</span>
      <span className="hidden sm:inline">Add NotifiedLaw as a preferred source on Google</span>
    </a>
  );
}
