"use client";

import { useRouter } from "next/navigation";
import { usePlan } from "@/components/plan";
import { PLAN_PRICES, cedis } from "@/lib/content";
import { CREDIT_NAME, PAID_PLANS, PLAN_CREDITS, PLAN_NAMES, type PaidPlan } from "@/lib/data";

const TIERS: { plan: PaidPlan; blurb: string; feats: [boolean, string][]; badge?: string }[] = [
  { plan: "Student", blurb: "The full library, Levels 100 to 400.", feats: [[true, "Every topic, Levels 100 to 400"], [true, "Starter flashcard decks"], [true, "500 MB for My Files"], [false, "Pre-Bar and Bar Course"]] },
  { plan: "Pro", blurb: "The full library, with AI to help it stick.", feats: [[true, "Everything in Student"], [true, "AI Summaries for every note"], [true, "Unlimited AI flashcards"], [true, "5 GB for My Files"], [false, "Pre-Bar and Bar Course"], [false, "AI podcasts"]] },
  { plan: "Pro Max", badge: "MOST COMPLETE", blurb: "Everything, plus AI that listens, talks and tutors.", feats: [[true, "Everything in Senior Judicial (Pro)"], [true, "Pre-Bar and Bar Course"], [true, "AI podcast of any note"], [true, "Personal AI tutor"], [true, "Exam mode with IRAC feedback"], [true, "10 GB for My Files"]] },
];

export function Plans() {
  const router = useRouter();
  const { plan: current, paid } = usePlan();
  const rank = (p: string) => PAID_PLANS.indexOf(p as PaidPlan);

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-6 px-5 pb-12 pt-10 text-center md:px-10">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Study smarter, from Level 100 to the Bar</h1>
        <p className="mt-1 text-[15px] text-muted">Billed monthly. Pay with MTN MoMo, Telecel Cash or card. Cancel anytime.</p>
      </div>
      {!paid && <p className="m-0 w-full rounded-xl bg-blue/10 px-4 py-3 text-left text-[13px]"><b>Choose a plan to start using NotifiedLaw.</b> Every plan opens the full library from Level 100 to 400.</p>}
      <div className="grid w-full gap-4 text-left md:grid-cols-3">
        {TIERS.map((t) => {
          const isCur = t.plan === current;
          const featured = t.plan === "Pro Max";
          return (
            <div key={t.plan} className={`relative flex flex-col gap-3 rounded-[20px] bg-surface p-6 shadow-card ${featured ? "ring-2 ring-blue" : ""}`}>
              {t.badge && <span className="absolute -top-2.5 left-6 rounded-full bg-blue px-2.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span>}
              <div className="text-[15px] font-semibold">{PLAN_NAMES[t.plan]}</div>
              <div><span className="text-4xl font-bold tracking-tight">{cedis(PLAN_PRICES[t.plan])}</span><span className="text-sm text-muted"> / month</span></div>
              <p className="text-[13px] text-muted">{t.blurb}</p>
              <div className="rounded-lg bg-fill px-3 py-2 text-[13px] font-semibold">
                {PLAN_CREDITS[t.plan] > 0 ? `${PLAN_CREDITS[t.plan]} ${CREDIT_NAME} / month` : `No ${CREDIT_NAME}`}
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-[13px]">
                {t.feats.map(([on, f]) => <li key={f} className="flex gap-2" style={{ opacity: on ? 1 : 0.45 }}><span className={on ? "text-green" : ""}>{on ? "✓" : "—"}</span>{f}</li>)}
              </ul>
              <button disabled={isCur} onClick={() => router.push(`/checkout?plan=${encodeURIComponent(t.plan)}`)}
                className={`h-9 rounded-lg text-[13px] font-semibold ${isCur ? "bg-fill text-muted" : featured ? "bg-blue text-white" : "bg-strong text-strong-fg"}`}>
                {isCur ? "Current plan" : `${!paid ? "Choose" : rank(t.plan) < rank(current) ? "Switch to" : "Upgrade to"} ${PLAN_NAMES[t.plan].split(" (")[0]}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="w-full rounded-xl bg-fill px-4 py-3 text-left text-[13px] text-ink/80"><b>Pre-Bar and Bar Course are Supreme Justice (Max) only.</b> Student and Senior Judicial (Pro) cover Levels 100 to 400.</p>
      <p className="text-xs text-muted">{CREDIT_NAME} power Notified AI. One message costs 1 credit, and your allowance resets each month. Verify with your university email for a 7-day Senior Judicial (Pro) trial.</p>
    </div>
  );
}
