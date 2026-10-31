"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePlan } from "@/components/plan";
import { PromoCode } from "@/components/promo-code";
import { Btn } from "@/components/ui";
import { NETWORKS, PLAN_PRICES, cedis } from "@/lib/content";
import { PLAN_NAMES, isPaidPlan, type PaidPlan } from "@/lib/data";
import { DEMO_BILLING } from "@/lib/site";
import { normalizePhone } from "@/lib/profile";

// Demo flow only. Real payments will go through a Worker calling a MoMo/card provider,
// with the subscription written to D1 on webhook confirmation.
export function Checkout() {
  const params = useSearchParams();
  // The plan comes from the URL, so only a known paid plan is accepted; anything else checks out Max.
  const asked = params.get("plan");
  const target: PaidPlan = isPaidPlan(asked) ? asked : "Pro Max";
  const price = cedis(PLAN_PRICES[target]);
  const item = PLAN_NAMES[target];
  const { setPlan, student } = usePlan();
  const [net, setNet] = useState(0);
  const [phone, setPhone] = useState("24 555 0123");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const momo = normalizePhone(phone);
  const [stage, setStage] = useState<"form" | "wait" | "done">("form");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pay = () => {
    if (!momo) { setPhoneTouched(true); return; }
    setStage("wait");
    timer.current = setTimeout(() => {
      setPlan(target);
      setStage("done");
    }, 1800);
  };

  if (target === "Student" && !student?.eligible)
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-[18px] py-20 text-center">
        <h1 className="m-0 text-[36px] leading-[1.05]">The Student plan needs a verified student account.</h1>
        <p className="m-0 text-[16px] text-muted">{student ? "Your student verification is over a year old. Re-verify from Plans." : "Create a student account with your university email to choose it."}</p>
        <Btn href="/plans">Back to plans</Btn>
      </div>
    );

  if (stage !== "form")
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-[18px] py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full text-3xl text-white" style={{ background: stage === "done" ? "var(--primary)" : "#E0683A" }}>{stage === "done" ? "✓" : "…"}</div>
        <h1 className="m-0 text-[36px] leading-[1.05]" aria-live="polite">{stage === "done" ? `You’re on ${PLAN_NAMES[target]}` : "Approve the prompt on your phone"}</h1>
        <p className="m-0 text-[16px] text-muted">{stage === "done" ? "Everything is unlocked. Happy studying." : `We sent a ${NETWORKS[net].label} request to +233 ${phone}.`}</p>
        {stage === "done" && <Btn href="/dashboard">Go to Home</Btn>}
      </div>
    );

  return (
    <div className="mx-auto grid w-full max-w-[960px] gap-7 px-[18px] pb-12 pt-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:px-8 md:pt-7 lg:px-14 lg:pt-10">
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Last step</div>
          <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px]">Subscribe to {item.split(" (")[0]}.</h1>
          <p className="m-0 text-[17px] text-muted">Pay securely with Mobile Money.</p>
        </header>
        <div className="flex flex-col gap-4 rounded-[22px] border border-edge/10 bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Mobile Money network</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {NETWORKS.map((n, i) => (
              <button key={n.label} type="button" aria-pressed={i === net} onClick={() => setNet(i)} className="flex h-14 items-center gap-3 rounded-[14px] px-3.5 text-left text-[15px] font-medium" style={{ background: i === net ? "var(--tint)" : "var(--surface)", boxShadow: i === net ? "0 0 0 2px var(--primary)" : "0 0 0 1px color-mix(in srgb, var(--ink) 15%, transparent)" }}>
                <span className="flex size-8 items-center justify-center rounded-[8px] text-[11px] font-bold" style={{ background: n.bg, color: n.fg }}>{n.mark}</span>{n.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="momo-phone" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Phone number</label>
          <div className="flex h-[52px] items-center gap-2.5 rounded-[14px] border border-edge/15 bg-surface px-4 focus-within:border-transparent focus-within:shadow-[0_0_0_2px_var(--primary)]">
            <span className="text-[17px] text-muted">+233</span>
            <input id="momo-phone" type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))} onBlur={() => setPhoneTouched(true)} maxLength={13} aria-invalid={phoneTouched && !momo} aria-describedby="momo-hint" inputMode="tel" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
          </div>
          <p id="momo-hint" className={`m-0 text-[14px] ${phoneTouched && !momo ? "text-plum" : "text-muted"}`} role={phoneTouched && !momo ? "alert" : undefined}>{phoneTouched && !momo ? "Enter a 9-digit Ghana mobile number, like 24 123 4567." : "You’ll get a prompt on this number to approve the payment."}</p>
        </div>
        {DEMO_BILLING ? (
          <Btn onClick={pay} disabled={!momo} className="h-[52px]! text-[17px]!">Pay {price}</Btn>
        ) : (
          <p className="m-0 rounded-[14px] bg-fill px-4 py-3 text-[15px] text-muted">Payments are not open yet, so your plan has not changed. We will announce it when they are.</p>
        )}
        </div>
      </section>
      <aside className="h-fit rounded-[22px] bg-tint p-6 md:mt-[118px]">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Order summary</div>
        <div className="mt-3 flex items-baseline justify-between gap-3"><span className="text-[16px]">{item}</span><span className="font-display text-[30px] leading-none">{price}</span></div>
        <div className="mt-1 text-[14px] text-muted">Monthly · cancel anytime</div>
        <div className="mt-4 border-t border-edge/10 pt-4"><PromoCode /></div>
        <div className="mt-4 border-t border-edge/10 pt-4 text-[14px] text-muted">Changed your mind? <Link href="/plans">Back to plans</Link></div>
      </aside>
    </div>
  );
}
