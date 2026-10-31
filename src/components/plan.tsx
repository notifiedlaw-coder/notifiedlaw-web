"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { PLAN_CREDITS, isPlan, type Level, type Plan } from "@/lib/data";
import type { Me, Profile, StudentState } from "@/lib/profile";
import { DEMO_BILLING } from "@/lib/site";

type Ctx = {
  /** `paid`: any plan, Student up. `pro`: Senior Judicial (Pro) or Supreme Justice (Max). */
  plan: Plan; setPlan: (p: Plan) => void; paid: boolean; pro: boolean; max: boolean;
  /** Notify Credits available: what is left of the monthly allowance. */
  credits: number; allowance: number;
  spend: (n: number) => boolean;
  /** Onboarding answers; null for guests, before they load, or if onboarding is not done. */
  profile: Profile | null;
  setLevel: (l: Level) => void;
  /** Replaces the cached profile after it was saved from Settings. */
  setProfile: (p: Profile) => void;
  /** When the plan from a promo code ends (epoch ms), while that is the plan in use; null otherwise. */
  promoUntil: number | null;
  /** The account's student record; null for professional accounts and guests. */
  student: StudentState | null;
  /** The profile picture's URL; null without one. */
  avatar: string | null;
};
const PlanCtx = createContext<Ctx>({ plan: "None", setPlan: () => {}, paid: false, pro: false, max: false, credits: 0, allowance: 0, spend: () => false, profile: null, setLevel: () => {}, setProfile: () => {}, promoUntil: null, student: null, avatar: null });

const send = (url: string, method: string, body: unknown) =>
  void fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});

// Plan, credits and profile live in D1 and are read on the server for each request (AppFrame), so the
// first paint already shows the right plan. Guests (null) have no plan.
export function PlanProvider({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const [state, setState] = useState<{ plan: Plan; used: number; profile: Profile | null }>(() => ({
    plan: me && isPlan(me.subscription.plan) ? me.subscription.plan : "None",
    used: me?.subscription.creditsUsed ?? 0,
    profile: me?.profile ?? null,
  }));
  const { plan, used, profile } = state;
  const student = me?.student ?? null;
  const promoUntil = me?.subscription.promoUntil ?? null;
  const avatar = me?.avatar ?? null;
  const allowance = PLAN_CREDITS[plan];
  const credits = Math.max(0, allowance - used);

  // Demo-only: the real balance will be debited server-side with each AI request.
  const spend = useCallback((n: number) => {
    if (credits < n) return false;
    setState((s) => ({ ...s, used: used + n }));
    if (DEMO_BILLING) send("/api/subscription", "PUT", { creditsUsed: used + n });
    return true;
  }, [credits, used]);
  const setPlan = useCallback((p: Plan) => {
    if (!DEMO_BILLING) return; // production plans come from the database
    setState((s) => ({ ...s, plan: p }));
    send("/api/subscription", "PUT", { plan: p });
  }, []);
  const setProfile = useCallback((profile: Profile) => setState((s) => ({ ...s, profile })), []);
  const setLevel = useCallback((level: Level) => {
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, level } } : s));
    send("/api/profile", "PATCH", { level });
  }, []);

  // Memoised so the many consumers only re-render when the plan or balance actually changes.
  const value = useMemo(
    () => ({ plan, setPlan, paid: plan !== "None", pro: plan === "Pro" || plan === "Pro Max", max: plan === "Pro Max", credits, allowance, spend, profile, setLevel, setProfile, promoUntil, student, avatar }),
    [plan, setPlan, credits, allowance, spend, profile, setLevel, setProfile, promoUntil, student, avatar],
  );
  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export const usePlan = () => useContext(PlanCtx);

/** The level a screen shows: the user's own pick on this screen, else their profile level, else 200. */
export function useStudyLevel(): [Level, (l: Level) => void] {
  const { profile } = usePlan();
  const [picked, setPicked] = useState<Level | null>(null);
  return [picked ?? (profile?.level || "200"), setPicked];
}

/** Renders children only while the viewer is below Supreme Justice (Max). */
export function ShowUnlessMax({ children }: { children: React.ReactNode }) {
  return usePlan().max ? null : <>{children}</>;
}
