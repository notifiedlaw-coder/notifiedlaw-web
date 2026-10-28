"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PLAN_CREDITS, isPlan, type Level, type Plan } from "@/lib/data";
import type { Profile } from "@/lib/profile";

type Ctx = {
  plan: Plan; setPlan: (p: Plan) => void; pro: boolean; max: boolean;
  /** Total Notify Credits available: what is left of the monthly allowance plus purchased extras. */
  credits: number; allowance: number; extra: number;
  spend: (n: number) => boolean; addCredits: (n: number) => void;
  /** Onboarding answers; null for guests, before they load, or if onboarding is not done. */
  profile: Profile | null;
  setLevel: (l: Level) => void;
};
const PlanCtx = createContext<Ctx>({ plan: "Free", setPlan: () => {}, pro: false, max: false, credits: 0, allowance: 0, extra: 0, spend: () => false, addCredits: () => {}, profile: null, setLevel: () => {} });

type Me = { subscription: { plan: string; creditsUsed: number; creditsExtra: number }; profile: Profile | null };

const send = (url: string, method: string, body: unknown) =>
  void fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});

// Plan, credits and profile live in D1 and come from /api/me. Guests (401) are treated as Free.
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ plan: Plan; used: number; extra: number; profile: Profile | null }>({ plan: "Free", used: 0, extra: 0, profile: null });
  useEffect(() => {
    let live = true;
    fetch("/api/me").then((r) => (r.ok ? (r.json() as Promise<Me>) : null)).then((me) => {
      if (!live || !me) return;
      const sub = me.subscription;
      setState({ plan: isPlan(sub.plan) ? sub.plan : "Free", used: sub.creditsUsed, extra: sub.creditsExtra, profile: me.profile });
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const { plan, used, extra, profile } = state;
  const allowance = PLAN_CREDITS[plan];
  const monthly = Math.max(0, allowance - used);
  const credits = monthly + extra;

  // Demo-only: the real balance will be debited server-side with each AI request.
  // The monthly allowance is spent first so purchased credits last.
  const spend = useCallback((n: number) => {
    if (credits < n) return false;
    const fromMonthly = Math.min(monthly, n);
    const next = { used: used + fromMonthly, extra: extra - (n - fromMonthly) };
    setState((s) => ({ ...s, ...next }));
    send("/api/subscription", "PUT", { creditsUsed: next.used, creditsExtra: next.extra });
    return true;
  }, [credits, monthly, used, extra]);
  const addCredits = useCallback((n: number) => {
    setState((s) => ({ ...s, extra: s.extra + n }));
    send("/api/subscription", "PUT", { creditsExtra: extra + n });
  }, [extra]);
  const setPlan = useCallback((p: Plan) => {
    setState((s) => ({ ...s, plan: p }));
    send("/api/subscription", "PUT", { plan: p });
  }, []);
  const setLevel = useCallback((level: Level) => {
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, level } } : s));
    send("/api/profile", "PATCH", { level });
  }, []);

  // Memoised so the many consumers only re-render when the plan or balance actually changes.
  const value = useMemo(
    () => ({ plan, setPlan, pro: plan !== "Free", max: plan === "Pro Max", credits, allowance, extra, spend, addCredits, profile, setLevel }),
    [plan, setPlan, credits, allowance, extra, spend, addCredits, profile, setLevel],
  );
  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export const usePlan = () => useContext(PlanCtx);

/** The level a screen shows: the user's own pick on this screen, else their profile level, else 200. */
export function useStudyLevel(): [Level, (l: Level) => void] {
  const { profile } = usePlan();
  const [picked, setPicked] = useState<Level | null>(null);
  return [picked ?? profile?.level ?? "200", setPicked];
}

/** Renders children only while the viewer is below Supreme Justice (Max). */
export function ShowUnlessMax({ children }: { children: React.ReactNode }) {
  return usePlan().max ? null : <>{children}</>;
}

/** Renders children only for the Free plan, which has no Notify Credits. */
export function ShowIfFree({ children }: { children: React.ReactNode }) {
  return usePlan().pro ? null : <>{children}</>;
}
