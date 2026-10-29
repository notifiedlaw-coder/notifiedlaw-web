"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/site";

type Api = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Api } }

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<Api> | undefined;

/** Loads Cloudflare's Turnstile script once per page. */
function loadTurnstile() {
  loading ??= new Promise<Api>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => { loading = undefined; reject(new Error("turnstile failed to load")); };
    document.head.appendChild(s);
  });
  return loading;
}

export type TurnstileHandle = { reset: () => void };

/**
 * Cloudflare Turnstile, in managed mode: most visitors pass without seeing a puzzle. Calls `onToken` with a fresh
 * token, or null when it expires or fails. A token works once, so call `reset()` after each use.
 */
export function Turnstile({ onToken, ref }: { onToken: (t: string | null) => void; ref?: React.Ref<TurnstileHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  useEffect(() => { cb.current = onToken; });

  useImperativeHandle(ref, () => ({
    reset: () => { cb.current(null); if (id.current) window.turnstile?.reset(id.current); },
  }), []);

  useEffect(() => {
    let gone = false;
    loadTurnstile().then((ts) => {
      if (gone || !box.current) return;
      id.current = ts.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: "student-link",
        size: "flexible",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    }).catch(() => cb.current(null));
    return () => {
      gone = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, []);

  return <div ref={box} className="min-h-[65px]" />;
}
