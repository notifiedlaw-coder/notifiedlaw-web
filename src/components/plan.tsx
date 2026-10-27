"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEMO_USER, PLAN_CREDITS, type Plan } from "@/lib/data";

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

// Demo-only: the real plan will come from the signed-in user's subscription (D1).
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<Plan>("Pro Max");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as Plan | null;
      if (v) setPlanState(v);
      else setPlanState(DEMO_USER.plan === "Free" ? "Pro Max" : DEMO_USER.plan);
    } catch {}
  }, []);
  const [used, setUsed] = useState(0);
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    try {
      setUsed(Number(localStorage.getItem(USED)) || 0);
      setExtra(Number(localStorage.getItem(EXTRA)) || 0);
    } catch {}
  }, []);
  const allowance = PLAN_CREDITS[plan];
  const monthly = Math.max(0, allowance - used);
  const credits = monthly + extra;
  const save = (k: string, v: number) => {
    try {
      localStorage.setItem(k, String(v));
    } catch {}
  };
  // Demo-only: the real balance will be debited server-side with each AI request.
  // The monthly allowance is spent first so purchased credits last.
  const spend = (n: number) => {
    if (credits < n) return false;
    const fromMonthly = Math.min(monthly, n);
    setUsed(used + fromMonthly);
    save(USED, used + fromMonthly);
    if (n > fromMonthly) {
      setExtra(extra - (n - fromMonthly));
      save(EXTRA, extra - (n - fromMonthly));
    }
    return true;
  };
  const addCredits = (n: number) => {
    setExtra(extra + n);
    save(EXTRA, extra + n);
  };
  const setPlan = (p: Plan) => {
    setPlanState(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {}
  };
  return (
    <PlanCtx.Provider value={{ plan, setPlan, pro: plan !== "Free", max: plan === "Pro Max", credits, allowance, extra, spend, addCredits }}>
      {children}
    </PlanCtx.Provider>
  );
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
