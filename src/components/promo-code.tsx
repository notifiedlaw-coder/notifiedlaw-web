"use client";

import { useState } from "react";
import { usePlan } from "@/components/plan";
import { PLAN_NAMES, type PaidPlan } from "@/lib/data";

const day = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(ms);

/**
 * "Have a code?": redeems a promo code, then reloads so every screen picks up the new plan. While a promo plan
 * is in use it says when that plan ends instead.
 */
export function PromoCode({ className = "" }: { className?: string }) {
  const { plan, paid, promoUntil } = usePlan();
  // Open from the start for accounts with no plan, who are the ones a code is for.
  const [open, setOpen] = useState(!paid);
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: string }>({});

  if (promoUntil && plan !== "None")
    return <p className={`m-0 rounded-xl bg-green/10 px-4 py-3 text-left text-[13px] ${className}`}><b>{PLAN_NAMES[plan as PaidPlan]} is yours until {day(promoUntil)}</b>, with your promo code.</p>;

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setState({ busy: true });
    const res = await fetch("/api/promo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { error?: string; plan?: PaidPlan; promoUntil?: number } | null;
    if (!res?.ok || !json?.plan) return setState({ error: json?.error ?? "Could not reach NotifiedLaw. Check your connection and try again." });
    setState({ done: `${PLAN_NAMES[json.plan]} is yours until ${day(json.promoUntil!)}.` });
    setTimeout(() => window.location.reload(), 1200);
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
        <button type="submit" disabled={state.busy || !!state.done || !code.trim()} className="h-10 rounded-[10px] bg-blue px-4 text-[13px] font-semibold text-white disabled:opacity-50">{state.busy ? "Applying…" : "Apply"}</button>
      </div>
      <p id="promo-hint" role={state.error ? "alert" : "status"} className={`m-0 min-h-[16px] text-xs ${state.error ? "text-red" : state.done ? "text-green" : "text-muted"}`}>{state.error ?? state.done ?? ""}</p>
    </form>
  );
}
