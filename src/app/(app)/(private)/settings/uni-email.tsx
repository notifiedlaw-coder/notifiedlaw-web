"use client";

import { useEffect, useState } from "react";
import { usePlan } from "@/components/plan";
import { fieldCls } from "@/components/profile-fields";
import { Btn, Eyebrow } from "@/components/ui";
import type { UniEmailState } from "@/lib/profile";
import { LINK_MINUTES, RESEND_SECONDS, TRIAL_DAYS, checkUniEmail, domainsFor } from "@/lib/uni-email";

const fmt = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Africa/Accra" }).format(new Date(ms));

/** Seconds left until `until` (epoch ms), ticking once a second; 0 when there is nothing to wait for. */
function useSecondsLeft(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [until]);
  return Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((until - now) / 1000)));
}

/** Settings: add a university email, send the link, and show the trial it unlocks. */
export function UniEmail() {
  const { profile, uniEmail, setUniEmail, trialEndsAt, onTrial } = usePlan();
  const university = profile?.university ?? "";
  const domains = domainsFor(university);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(!uniEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const until = uniEmail?.sentAt ? uniEmail.sentAt + RESEND_SECONDS * 1000 : 0;
  const left = useSecondsLeft(until);

  const send = async (email: string) => {
    const local = checkUniEmail(email, university);
    if ("error" in local) { setError(local.error); return; }
    setBusy(true);
    setError("");
    const res = await fetch("/api/uni-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: local.email }) }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { error?: string; uniEmail?: UniEmailState } | null;
    setBusy(false);
    if (!res?.ok || !body?.uniEmail) { setError(body?.error ?? "Could not reach NotifiedLaw. Check your connection and try again."); return; }
    setUniEmail(body.uniEmail);
    setEditing(false);
  };

  const trialLine = onTrial && trialEndsAt
    ? `Senior Judicial (Pro) trial active until ${fmt(trialEndsAt)}.`
    : trialEndsAt ? "Your free trial has been used." : `Verify to start a ${TRIAL_DAYS}-day Senior Judicial (Pro) trial.`;

  let body: React.ReactNode;
  if (!university) {
    body = <p className="m-0 text-sm text-muted">Choose your university in your profile above, save, then add your university email here.</p>;
  } else if (!domains.length) {
    body = <p className="m-0 text-sm text-muted">University emails for {university} are not supported yet.</p>;
  } else if (uniEmail?.verified) {
    body = (
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[15px]">{uniEmail.email}</span>
        <span className="shrink-0 rounded-full bg-green/15 px-2.5 py-0.5 text-xs font-semibold text-[#248A3D]">Verified</span>
      </div>
    );
  } else if (uniEmail && !editing) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm">We sent a link to <b>{uniEmail.email}</b>. Open it within {LINK_MINUTES} minutes to confirm. Check your junk folder if you do not see it.</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Btn tone="plain" onClick={() => { setValue(uniEmail.email); setEditing(true); setError(""); }}>Use a different email</Btn>
          <Btn onClick={() => void send(uniEmail.email)} disabled={busy || left > 0}>{busy ? "Sending…" : left > 0 ? `Resend in ${left}s` : "Resend link"}</Btn>
        </div>
      </div>
    );
  } else {
    body = (
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void send(value); }}>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
          <span>{university} email <span className="font-normal text-muted">(ends in {domains.map((d) => "@" + d).join(" or ")}, or a subdomain)</span></span>
          <input type="email" inputMode="email" autoComplete="email" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} maxLength={254} placeholder={`you@${domains[0]}`} className={fieldCls} />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {uniEmail && <Btn tone="plain" onClick={() => { setEditing(false); setError(""); }}>Cancel</Btn>}
          <Btn type="submit" disabled={busy || !value.trim()}>{busy ? "Sending…" : "Verify"}</Btn>
        </div>
      </form>
    );
  }

  return (
    <section className="flex flex-col gap-1.5">
      <Eyebrow>University email</Eyebrow>
      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
        {body}
        {error && <p className="m-0 text-sm text-red" role="alert">{error}</p>}
        {university && domains.length > 0 && <p className="m-0 text-[13px] text-muted">{trialLine} Each university email can be linked to one account only.</p>}
      </div>
    </section>
  );
}
