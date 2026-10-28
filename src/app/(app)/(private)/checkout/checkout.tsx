"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePlan } from "@/components/plan";
import { Btn } from "@/components/ui";
import { CREDIT_PACKS, NETWORKS, PRICES } from "@/lib/content";
import { CREDIT_NAME, PLAN_NAMES, isPlan, type Plan } from "@/lib/data";
import { DEMO_BILLING } from "@/lib/site";

// Demo flow only. Real payments will go through a Worker calling a MoMo/card provider,
// with the subscription written to D1 on webhook confirmation.
export function Checkout() {
  const params = useSearchParams();
  // The plan comes from the URL, so only a known paid plan is accepted; anything else checks out Max.
  const asked = params.get("plan");
  const target: Plan = isPlan(asked) && asked !== "Free" ? asked : "Pro Max";
  const billing = params.get("billing") === "month" ? "month" : "semester";
  const pack = CREDIT_PACKS.find((p) => p.id === params.get("credits"));
  const price = pack ? pack.price : PRICES[billing][target === "Pro" ? "pro" : "max"];
  const item = pack ? `${pack.credits} ${CREDIT_NAME}` : PLAN_NAMES[target];
  const { setPlan, addCredits } = usePlan();
  const [net, setNet] = useState(0);
  const [phone, setPhone] = useState("24 555 0123");
  const [stage, setStage] = useState<"form" | "wait" | "done">("form");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pay = () => {
    setStage("wait");
    timer.current = setTimeout(() => {
      if (pack) addCredits(pack.credits);
      else setPlan(target);
      setStage("done");
    }, 1800);
  };

  if (stage !== "form")
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-5 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full text-3xl text-white" style={{ background: stage === "done" ? "#34C759" : "#FF9500" }}>{stage === "done" ? "✓" : "…"}</div>
        <h1 className="text-2xl font-bold" aria-live="polite">{stage === "done" ? (pack ? `${pack.credits} ${CREDIT_NAME} added` : `You’re on ${PLAN_NAMES[target]}`) : "Approve the prompt on your phone"}</h1>
        <p className="text-sm text-muted">{stage === "done" ? (pack ? "Your credits are ready in Notified AI." : "Everything is unlocked. Happy studying.") : `We sent a ${NETWORKS[net].label} request to +233 ${phone}.`}</p>
        {stage === "done" && <Btn href="/dashboard">Go to Home</Btn>}
      </div>
    );

  return (
    <div className="mx-auto grid max-w-[880px] gap-6 px-5 pb-12 pt-8 md:px-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">{pack ? `Buy ${item}` : `Upgrade to ${PLAN_NAMES[target]}`}</h1>
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
            <input id="momo-phone" type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          <p className="text-xs text-muted">You’ll get a prompt on this number to approve the payment.</p>
        </div>
        {DEMO_BILLING ? (
          <Btn onClick={pay} className="h-11 text-[15px]">Pay {price}</Btn>
        ) : (
          <p className="m-0 rounded-xl bg-fill px-4 py-3 text-sm text-muted">Payments are not open yet, so your plan has not changed. We will announce it when they are.</p>
        )}
      </section>
      <aside className="h-fit rounded-2xl bg-surface p-5 shadow-card">
        <div className="text-xs font-semibold text-muted">Order summary</div>
        <div className="mt-2 flex justify-between text-sm"><span>{item}</span><span className="font-semibold">{price}</span></div>
        <div className="mt-1 text-xs text-muted">{pack ? "One-off purchase · never expires" : `${billing === "month" ? "Monthly" : "Per semester"} · cancel anytime`}</div>
        <div className="mt-3 border-t border-edge/10 pt-3 text-xs text-muted">Changed your mind? <Link href="/plans">Back to plans</Link></div>
      </aside>
    </div>
  );
}
