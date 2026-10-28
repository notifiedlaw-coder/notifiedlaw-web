"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_USER, PLAN_CREDITS, isPlan, type Plan } from "@/lib/data";

type Ctx = {
  plan: Plan; setPlan: (p: Plan) => void; pro: boolean; max: boolean;
  /** Total Notify Credits available: what is left of the monthly allowance plus purchased extras. */
  credits: number; allowance: number; extra: number;
  spend: (n: number) => boolean; addCredits: (n: number) => void;
};
const PlanCtx = createContext<Ctx>({ plan: "Pro Max", setPlan: () => {}, pro: true, max: true, credits: 0, allowance: 0, extra: 0, spend: () => false, addCredits: () => {} });
const KEY = "nl-plan";
const USED = "nl-credits-used";
const EXTRA = "nl-credits-extra";

const save = (k: string, v: string | number) => {
  try {
    localStorage.setItem(k, String(v));
  } catch {}
};
/** A stored count, or 0 if it is missing, negative or not a number. */
const count = (k: string) => Math.max(0, Math.floor(Number(localStorage.getItem(k)))) || 0;

// Demo-only: the real plan will come from the signed-in user's subscription (D1).
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ plan: Plan; used: number; extra: number }>({ plan: "Pro Max", used: 0, extra: 0 });
  useEffect(() => {
    try {
      // Anything unrecognised in storage falls back to the default, so a bad value can't break the app.
      const v = localStorage.getItem(KEY);
      const plan = isPlan(v) ? v : DEMO_USER.plan === "Free" ? "Pro Max" : DEMO_USER.plan;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage, read once on mount
      setState({ plan, used: count(USED), extra: count(EXTRA) });
    } catch {}
  }, []);
  const { plan, used, extra } = state;
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
    save(USED, next.used);
    save(EXTRA, next.extra);
    return true;
  }, [credits, monthly, used, extra]);
  const addCredits = useCallback((n: number) => {
    setState((s) => {
      save(EXTRA, s.extra + n);
      return { ...s, extra: s.extra + n };
    });
  }, []);
  const setPlan = useCallback((p: Plan) => {
    setState((s) => ({ ...s, plan: p }));
    save(KEY, p);
  }, []);

  // Memoised so the many consumers only re-render when the plan or balance actually changes.
  const value = useMemo(
    () => ({ plan, setPlan, pro: plan !== "Free", max: plan === "Pro Max", credits, allowance, extra, spend, addCredits }),
    [plan, setPlan, credits, allowance, extra, spend, addCredits],
  );
  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export const usePlan = () => useContext(PlanCtx);

/** Renders children only while the viewer is below Supreme Justice (Max). */
export function ShowUnlessMax({ children }: { children: React.ReactNode }) {
  return usePlan().max ? null : <>{children}</>;
}

/** Renders children only for the Free plan, which has no Notify Credits. */
export function ShowIfFree({ children }: { children: React.ReactNode }) {
  return usePlan().pro ? null : <>{children}</>;
}
