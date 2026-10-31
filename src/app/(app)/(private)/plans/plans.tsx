"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlan } from "@/components/plan";
import { PromoCode } from "@/components/promo-code";
import { authClient } from "@/lib/auth-client";
import { PLAN_PRICES, cedis } from "@/lib/content";
import { CREDIT_NAME, PAID_PLANS, PLAN_CREDITS, PLAN_NAMES, type PaidPlan } from "@/lib/data";

const TIERS: { plan: PaidPlan; blurb: string; feats: [boolean, string][]; badge?: string }[] = [
  { plan: "Student", blurb: "The full library, Levels 100 to 400.", feats: [[true, "Every topic, Levels 100 to 400"], [true, "Starter flashcard decks"], [true, "500 MB for My Files"], [true, "Friends, plus group chats and calls for study sessions"], [false, "Weekly quiz leaderboard"], [false, "Pre-Bar and Bar Course"]] },
  { plan: "Pro", blurb: "The full library, with AI to help it stick.", feats: [[true, "Everything in Student"], [true, "AI Summaries for every note"], [true, "Unlimited AI flashcards"], [true, "Weekly quiz leaderboard"], [true, "5 GB for My Files"], [false, "Pre-Bar and Bar Course"], [false, "AI podcasts"]] },
  { plan: "Pro Max", badge: "Most complete", blurb: "Everything, plus AI that listens, talks and tutors.", feats: [[true, "Everything in Senior Judicial (Pro)"], [true, "Pre-Bar and Bar Course"], [true, "AI podcast of any note"], [true, "Personal AI tutor"], [true, "Exam mode with IRAC feedback"], [true, "10 GB for My Files"]] },
];

export function Plans() {
  const router = useRouter();
  const { plan: current, paid, student } = usePlan();
  const rank = (p: string) => PAID_PLANS.indexOf(p as PaidPlan);
  // Student needs a student account whose university mailbox was proven within the last year. The server
  // checks the same thing before it changes a plan.
  const [relink, setRelink] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const reverify = async () => {
    if (!student) return;
    setRelink("busy");
    const { error } = await authClient.signIn.magicLink({ email: student.email }).catch(() => ({ error: {} }));
    setRelink(error ? "error" : "sent");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-7 px-[18px] pb-12 pt-5 md:px-8 md:pt-7 lg:px-14 lg:pt-10">
      <header className="flex flex-col gap-2">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{paid ? "Your plan" : "Last step"}</div>
        <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">Choose how you study.</h1>
        <p className="m-0 text-[17px] text-muted">Billed monthly. Pay with MTN MoMo, Telecel Cash or card. Cancel anytime.</p>
      </header>
      {!paid && <p className="m-0 w-full rounded-[18px] bg-tint px-5 py-4 text-[15px]"><b>Choose a plan to start using NotifiedLaw.</b> Every plan opens the full library from Level 100 to 400.</p>}
      <PromoCode className="self-start" />
      {/* On wide screens the cards share one row grid (subgrid), so name, price, blurb, credits, features and button line up across all three. */}
      <div className="grid w-full gap-4 md:grid-cols-3 md:gap-x-4 md:gap-y-0">
        {TIERS.map((t) => {
          const isCur = t.plan === current;
          const featured = t.plan === (student ? "Student" : "Pro Max");
          const locked = t.plan === "Student" && !isCur && !student?.eligible;
          return (
            <div key={t.plan} className={`relative flex flex-col gap-3.5 rounded-[22px] border-2 p-6 md:row-span-6 md:grid md:grid-rows-subgrid md:items-start md:gap-y-3.5 ${featured ? "border-[var(--primary)] bg-tint" : "border-edge/10 bg-surface"}`}>
              {t.badge && <span className="absolute -top-3 left-6 rounded-full bg-[#E0683A] px-3 py-1 text-[12px] font-bold text-white">{t.badge}</span>}
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{PLAN_NAMES[t.plan]}</div>
              <div><span className="font-display text-[48px] leading-none">{cedis(PLAN_PRICES[t.plan])}</span><span className="text-[15px] text-muted"> / month</span></div>
              <p className="m-0 text-[15px] text-muted">{t.blurb}</p>
              <div className="rounded-[12px] bg-peach px-3.5 py-2 text-[14px] font-semibold text-[var(--peach-fg)]">
                {PLAN_CREDITS[t.plan] > 0 ? `${PLAN_CREDITS[t.plan]} ${CREDIT_NAME} / month` : `No ${CREDIT_NAME}`}
              </div>
              <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 self-start p-0 text-[15px]">
                {t.feats.map(([on, f]) => <li key={f} className="flex gap-2" style={{ opacity: on ? 1 : 0.45 }}><span className={on ? "text-green" : ""}>{on ? "✓" : "—"}</span>{f}</li>)}
              </ul>
              {locked && student ? (
                <div className="flex flex-col gap-1.5">
                  <button disabled={relink === "busy" || relink === "sent"} onClick={() => void reverify()} className="h-[52px] rounded-full bg-blue text-[16px] font-semibold text-white disabled:opacity-50">
                    {relink === "sent" ? "Link sent" : relink === "busy" ? "Sending…" : "Re-verify student status"}
                  </button>
                  <p className="m-0 text-[13px] text-muted">{relink === "sent" ? `Open the link we sent to ${student.email}.` : relink === "error" ? "Could not send the link. Try again in a minute." : "Your student verification is over a year old."}</p>
                </div>
              ) : locked ? (
                <div className="flex flex-col gap-1.5">
                  <button disabled className="h-[52px] rounded-full bg-fill text-[16px] font-semibold text-muted">Students only</button>
                  <p className="m-0 text-[13px] text-muted">Needs an account created with a university email.</p>
                </div>
              ) : (
                <button disabled={isCur} onClick={() => router.push(`/checkout?plan=${encodeURIComponent(t.plan)}`)}
                  className={`h-[52px] rounded-full text-[16px] font-semibold ${isCur ? "bg-fill text-muted" : featured ? "bg-blue text-white hover:bg-blue-press" : "border border-edge/15 bg-surface text-ink hover:bg-hover"}`}>
                  {isCur ? "Current plan" : `${!paid ? "Choose" : rank(t.plan) < rank(current) ? "Switch to" : "Upgrade to"} ${PLAN_NAMES[t.plan].split(" (")[0]}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="m-0 w-full rounded-[18px] bg-fill px-5 py-4 text-[15px] text-ink/80"><b>Pre-Bar and Bar Course are Supreme Justice (Max) only.</b> Student and Senior Judicial (Pro) cover Levels 100 to 400.</p>
      <p className="m-0 text-[13px] text-faint">{CREDIT_NAME} power Notified AI. One message costs 1 credit, and your allowance resets each month. The Student plan is for accounts verified with a university email, and is checked again each year.</p>
    </div>
  );
}
