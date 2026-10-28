"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlan } from "@/components/plan";
import { Segmented } from "@/components/ui";
import { CREDIT_PACKS, PRICES } from "@/lib/content";
import { CREDIT_NAME, PLAN_CREDITS, PLAN_NAMES, type Plan } from "@/lib/data";

const TIERS: { plan: Plan; blurb: string; feats: [boolean, string][]; badge?: string }[] = [
  { plan: "Free", blurb: "Try NotifiedLaw with starter content.", feats: [[true, "First 2 topics of every course"], [true, "Starter flashcard decks"], [false, `No ${CREDIT_NAME}`]] },
  { plan: "Pro", blurb: "The full library, with AI to help it stick.", feats: [[true, "Every level, 100 to 400"], [true, "AI Summaries for every note"], [true, "Unlimited AI flashcards"], [false, "Pre-Bar and Bar Course"], [false, "AI podcasts"]] },
  { plan: "Pro Max", badge: "MOST COMPLETE", blurb: "Everything, plus AI that listens, talks and tutors.", feats: [[true, "Everything in Senior Judicial (Pro)"], [true, "Pre-Bar and Bar Course"], [true, "AI podcast of any note"], [true, "Personal AI tutor"], [true, "Exam mode with IRAC feedback"]] },
];

export function Plans() {
  const router = useRouter();
  const { plan: current } = usePlan();
  const [billing, setBilling] = useState<"month" | "semester">("semester");
  const prices = PRICES[billing];

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-6 px-5 pb-12 pt-10 text-center md:px-10">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Study smarter, from Level 100 to the Bar</h1>
        <p className="mt-1 text-[15px] text-muted">Pay with MTN MoMo, Telecel Cash or card. Cancel anytime.</p>
      </div>
      <Segmented options={["month", "semester"] as const} value={billing} onChange={setBilling} labels={{ month: "Monthly", semester: "Per semester · Save 15%" }} />
      <div className="grid w-full gap-4 text-left md:grid-cols-3">
        {TIERS.map((t) => {
          const price = t.plan === "Free" ? "GH₵0" : t.plan === "Pro" ? prices.pro : prices.max;
          const isCur = t.plan === current;
          const featured = t.plan === "Pro Max";
          return (
            <div key={t.plan} className={`relative flex flex-col gap-3 rounded-[20px] bg-surface p-6 shadow-card ${featured ? "ring-2 ring-blue" : ""}`}>
              {t.badge && <span className="absolute -top-2.5 left-6 rounded-full bg-blue px-2.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span>}
              <div className="text-[15px] font-semibold">{PLAN_NAMES[t.plan]}</div>
              <div><span className="text-4xl font-bold tracking-tight">{price}</span>{t.plan !== "Free" && <span className="text-sm text-muted"> {prices.per}</span>}</div>
              <p className="text-[13px] text-muted">{t.blurb}</p>
              <div className="rounded-lg bg-fill px-3 py-2 text-[13px] font-semibold">
                {PLAN_CREDITS[t.plan] > 0 ? `${PLAN_CREDITS[t.plan]} ${CREDIT_NAME} / month` : `No ${CREDIT_NAME}`}
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-[13px]">
                {t.feats.map(([on, f]) => <li key={f} className="flex gap-2" style={{ opacity: on ? 1 : 0.45 }}><span className={on ? "text-green" : ""}>{on ? "✓" : "—"}</span>{f}</li>)}
              </ul>
              <button disabled={isCur} onClick={() => t.plan !== "Free" && router.push(`/checkout?plan=${encodeURIComponent(t.plan)}&billing=${billing}`)}
                className={`h-9 rounded-lg text-[13px] font-semibold ${isCur ? "bg-fill text-muted" : featured ? "bg-blue text-white" : "bg-strong text-strong-fg"}`}>
                {isCur ? "Current plan" : t.plan === "Free" ? "Downgrade" : `Upgrade to ${PLAN_NAMES[t.plan].split(" (")[0]}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="w-full rounded-xl bg-fill px-4 py-3 text-left text-[13px] text-ink/80"><b>Pre-Bar and Bar Course are Supreme Justice (Max) only.</b> Senior Judicial (Pro) covers Levels 100 to 400.</p>
      <section id="credits" className="flex w-full scroll-mt-6 flex-col gap-3 text-left">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-[-0.01em]">Need more {CREDIT_NAME}?</h2>
          <p className="mt-1 text-sm text-muted">Buy a pack on any plan, even Free. Extra credits never expire and are used after your monthly allowance.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((p) => (
            <button key={p.id} onClick={() => router.push(`/checkout?credits=${p.id}`)}
              className="relative flex flex-col items-start gap-1 rounded-2xl bg-surface p-5 text-left shadow-card transition-shadow hover:shadow-card-hover">
              {p.tag && <span className="absolute -top-2 right-4 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white">{p.tag}</span>}
              <span className="text-3xl font-bold tracking-tight">{p.credits}</span>
              <span className="text-[13px] text-muted">{CREDIT_NAME}</span>
              <span className="mt-2 text-lg font-semibold">{p.price}</span>
            </button>
          ))}
        </div>
      </section>
      <p className="text-xs text-muted">{CREDIT_NAME} power Notified AI. One message costs 1 credit, and your allowance resets each month. Student pricing. Verify with your university email for a 7-day Supreme Justice (Max) trial.</p>
    </div>
  );
}
