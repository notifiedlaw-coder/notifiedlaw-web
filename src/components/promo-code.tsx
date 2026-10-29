"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePlan } from "@/components/plan";
import { PLAN_CREDITS, PLAN_NAMES, type PaidPlan } from "@/lib/data";

const day = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(ms);

/**
 * "Have a code?": redeems a promo code. On success, confetti falls and a popup confirms the plan and when it
 * ends; closing it reloads (or opens Home) so every screen picks up the new plan. While a promo plan is in use
 * it says when that plan ends instead.
 */
export function PromoCode({ className = "" }: { className?: string }) {
  const { plan, paid, promoUntil } = usePlan();
  // Open from the start for accounts with no plan, who are the ones a code is for.
  const [open, setOpen] = useState(!paid);
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ busy?: boolean; error?: string; won?: { plan: PaidPlan; until: number } }>({});

  if (promoUntil && plan !== "None" && !state.won)
    return <p className={`m-0 rounded-xl bg-green/10 px-4 py-3 text-left text-[13px] ${className}`}><b>{PLAN_NAMES[plan as PaidPlan]} is yours until {day(promoUntil)}</b>, with your promo code.</p>;

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setState({ busy: true });
    const res = await fetch("/api/promo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { error?: string; plan?: PaidPlan; promoUntil?: number } | null;
    if (!res?.ok || !json?.plan || !json.promoUntil) return setState({ error: json?.error ?? "Could not reach NotifiedLaw. Check your connection and try again." });
    setState({ won: { plan: json.plan, until: json.promoUntil } });
  };

  if (!open)
    return <button type="button" onClick={() => setOpen(true)} className={`text-[13px] font-medium text-blue ${className}`}>Have a promo code?</button>;
  return (
    <form onSubmit={redeem} className={`flex w-full max-w-[420px] flex-col gap-1.5 text-left ${className}`}>
      <label htmlFor="promo-code" className="text-xs font-semibold text-muted">Promo code</label>
      <div className="flex gap-2">
        <input id="promo-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} autoComplete="off" autoCapitalize="characters" spellCheck={false}
          aria-invalid={!!state.error} aria-describedby="promo-hint" placeholder="Enter code"
          className="h-10 min-w-0 flex-1 rounded-[10px] bg-surface px-3 text-sm uppercase shadow-[0_0_0_0.5px_var(--hairline)] outline-none placeholder:normal-case focus-visible:ring-2 focus-visible:ring-blue/40" />
        <button type="submit" disabled={state.busy || !!state.won || !code.trim()} className="h-10 rounded-[10px] bg-blue px-4 text-[13px] font-semibold text-white disabled:opacity-50">{state.busy ? "Applying…" : "Apply"}</button>
      </div>
      <p id="promo-hint" role={state.error ? "alert" : "status"} className={`m-0 min-h-[16px] text-xs ${state.error ? "text-red" : state.won ? "text-green" : "text-muted"}`}>
        {state.error ?? (state.won ? "Code applied." : "")}
      </p>
      {state.won && <Unlocked plan={state.won.plan} until={state.won.until} />}
    </form>
  );
}

/** The celebration: confetti over the page and a popup saying what the code unlocked. */
function Unlocked({ plan, until }: { plan: PaidPlan; until: number }) {
  const button = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") window.location.reload(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const perks = ["Every topic, Levels 100 to 400", "Pre-Bar and Bar Course", `${PLAN_CREDITS[plan]} Notify Credits for Notified AI`, "AI podcasts, tutor and exam mode"];
  return createPortal(
    <>
      <Confetti />
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4 animate-[nl-fade_200ms_ease-out]" role="dialog" aria-modal="true" aria-labelledby="promo-won-title">
        <div className="flex w-full max-w-[380px] flex-col items-center gap-3 rounded-[22px] bg-surface p-6 text-center text-ink shadow-[0_24px_60px_rgba(0,0,0,0.3)] animate-[nl-pop_320ms_cubic-bezier(0.2,1.4,0.4,1)]">
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9500] to-[#FF2D55] text-[30px] shadow-[0_8px_20px_rgba(255,45,85,0.35)]" aria-hidden>🎉</div>
          <h2 id="promo-won-title" className="m-0 text-[22px] font-bold tracking-[-0.02em]">You&rsquo;re on {PLAN_NAMES[plan].split(" (")[0]}!</h2>
          <p className="m-0 text-[14px] text-muted">Your code unlocked {PLAN_NAMES[plan]} free until <b className="text-ink">{day(until)}</b>.</p>
          <ul className="m-0 flex w-full list-none flex-col gap-1.5 rounded-[14px] bg-fill p-3 text-left text-[13px]">
            {perks.map((p) => <li key={p} className="flex gap-2"><span className="text-green" aria-hidden>✓</span>{p}</li>)}
          </ul>
          <a ref={button} href="/dashboard" className="mt-1 flex h-11 w-full items-center justify-center rounded-full bg-blue text-[15px] font-semibold text-white hover:bg-blue-press" style={{ textDecoration: "none", color: "#fff" }}>Start studying</a>
          <button type="button" onClick={() => window.location.reload()} className="h-8 rounded-full px-3 text-[13px] text-blue hover:bg-fill">Stay on this page</button>
        </div>
      </div>
    </>,
    document.body,
  );
}

const COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF2D55", "#AF52DE", "#FFCC00", "#5AC8FA"];

/** Confetti bursting from both lower corners and drifting down, drawn on one canvas. Off for reduced motion. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    window.addEventListener("resize", size);
    const burst = (n: number, x: number, dir: number) => Array.from({ length: n }, () => {
      const angle = (-90 + dir * (15 + Math.random() * 40)) * (Math.PI / 180);
      const speed = 9 + Math.random() * 9;
      return {
        x, y: innerHeight + 10, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 1.35,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        tilt: Math.random() * Math.PI, color: COLORS[Math.floor(Math.random() * COLORS.length)], round: Math.random() < 0.25,
      };
    });
    const bits = [...burst(110, 0, 1), ...burst(110, innerWidth, -1)];
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const age = t - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.max(0, Math.min(1, (5200 - age) / 1200));
      for (const b of bits) {
        b.vy += 0.32;
        b.vx *= 0.985;
        b.vy = Math.min(b.vy, 4.5 + Math.sin(b.tilt) * 1.2);
        b.x += b.vx + Math.sin(b.tilt) * 0.8;
        b.y += b.vy;
        b.r += b.vr;
        b.tilt += 0.07;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.r);
        ctx.scale(1, Math.cos(b.tilt));
        ctx.fillStyle = b.color;
        if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      if (age < 5200) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[95] h-full w-full" aria-hidden />;
}
