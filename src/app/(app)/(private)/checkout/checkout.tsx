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
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">The Student plan needs a verified student account</h1>
        <p className="text-sm text-muted">{student ? "Your student verification is over a year old. Re-verify from Plans." : "Create a student account with your university email to choose it."}</p>
        <Btn href="/plans">Back to plans</Btn>
      </div>
    );

  if (stage !== "form")
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-5 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full text-3xl text-white" style={{ background: stage === "done" ? "#34C759" : "#FF9500" }}>{stage === "done" ? "✓" : "…"}</div>
        <h1 className="text-2xl font-bold" aria-live="polite">{stage === "done" ? `You’re on ${PLAN_NAMES[target]}` : "Approve the prompt on your phone"}</h1>
        <p className="text-sm text-muted">{stage === "done" ? "Everything is unlocked. Happy studying." : `We sent a ${NETWORKS[net].label} request to +233 ${phone}.`}</p>
        {stage === "done" && <Btn href="/dashboard">Go to Home</Btn>}
      </div>
    );

  return (
    <div className="mx-auto grid max-w-[880px] gap-6 px-5 pb-12 pt-8 md:px-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Subscribe to {item}</h1>
          <p className="mt-1 text-sm text-muted">Pay securely with Mobile Money or card.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-muted">Mobile Money network</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {NETWORKS.map((n, i) => (
              <button key={n.label} type="button" aria-pressed={i === net} onClick={() => setNet(i)} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-left text-[13px] font-medium" style={{ boxShadow: i === net ? "0 0 0 2px #007AFF" : "0 0 0 0.5px var(--hairline)" }}>
                <span className="flex size-7 items-center justify-center rounded-md text-[10px] font-bold" style={{ background: n.bg, color: n.fg }}>{n.mark}</span>{n.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="momo-phone" className="text-xs font-semibold text-muted">Phone number</label>
          <div className="flex h-10 items-center gap-2 rounded-[10px] bg-surface px-3 shadow-[0_0_0_0.5px_var(--hairline)]">
            <span className="text-sm text-muted">+233</span>
            <input id="momo-phone" type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))} onBlur={() => setPhoneTouched(true)} maxLength={13} aria-invalid={phoneTouched && !momo} aria-describedby="momo-hint" inputMode="tel" className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          <p id="momo-hint" className={`text-xs ${phoneTouched && !momo ? "text-red" : "text-muted"}`} role={phoneTouched && !momo ? "alert" : undefined}>{phoneTouched && !momo ? "Enter a 9-digit Ghana mobile number, like 24 123 4567." : "You’ll get a prompt on this number to approve the payment."}</p>
        </div>
        {DEMO_BILLING ? (
          <Btn onClick={pay} disabled={!momo} className="h-11 text-[15px] sm:h-11 sm:text-[15px]">Pay {price}</Btn>
        ) : (
          <p className="m-0 rounded-xl bg-fill px-4 py-3 text-sm text-muted">Payments are not open yet, so your plan has not changed. We will announce it when they are.</p>
        )}
      </section>
      <aside className="h-fit rounded-2xl bg-surface p-5 shadow-card">
        <div className="text-xs font-semibold text-muted">Order summary</div>
        <div className="mt-2 flex justify-between text-sm"><span>{item}</span><span className="font-semibold">{price}</span></div>
        <div className="mt-1 text-xs text-muted">Monthly · cancel anytime</div>
        <div className="mt-3 border-t border-edge/10 pt-3"><PromoCode /></div>
        <div className="mt-3 border-t border-edge/10 pt-3 text-xs text-muted">Changed your mind? <Link href="/plans">Back to plans</Link></div>
      </aside>
    </div>
  );
}
