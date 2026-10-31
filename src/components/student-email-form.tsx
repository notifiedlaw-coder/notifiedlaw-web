"use client";

import { useEffect, useRef, useState } from "react";
import { fieldCls } from "@/components/profile-fields";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { authClient } from "@/lib/auth-client";
import { UNIVERSITIES } from "@/lib/content";
import { LINK_MINUTES, RESEND_SECONDS, checkStudentEmail } from "@/lib/student";
import { TURNSTILE_HEADER } from "@/lib/site";

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

/** Sends a sign-in link to a university email. Signs students up the first time and signs them in after that. */
export function StudentEmailForm({ cta }: { cta: string }) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<{ email: string; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const left = useSecondsLeft(sent ? sent.at + RESEND_SECONDS * 1000 : 0);

  const send = async (raw: string) => {
    const checked = checkStudentEmail(raw);
    if ("error" in checked) { setError(checked.error); return; }
    if (!token) { setError("Wait for the security check below to finish, then try again."); return; }
    setBusy(true);
    setError("");
    const { error: e } = await authClient.signIn.magicLink({ email: checked.email, fetchOptions: { headers: { [TURNSTILE_HEADER]: token } } })
      .catch(() => ({ error: { message: "" } }));
    setBusy(false);
    turnstile.current?.reset(); // each token works once
    if (e) { setError(e.message || "Could not reach NotifiedLaw. Check your connection and try again."); return; }
    setSent({ email: checked.email, at: Date.now() });
  };

  // One widget for both views, so Resend gets a fresh token too.
  const check = <Turnstile ref={turnstile} onToken={setToken} />;

  if (sent)
    return (
      <div className="flex flex-col gap-3 rounded-[18px] bg-tint p-5 text-[15px]">
        <p className="m-0"><b>Check your inbox.</b> We sent a link to <b>{sent.email}</b>. Open it within {LINK_MINUTES} minutes, on any device. Check your junk folder if you do not see it.</p>
        {error && <p className="m-0 text-plum" role="alert">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="text-muted" onClick={() => { setValue(sent.email); setSent(null); setError(""); }}>Use a different email</button>
          <button type="button" className="font-semibold text-blue disabled:opacity-50" disabled={busy || left > 0 || !token} onClick={() => void send(sent.email)}>{busy ? "Sending…" : left > 0 ? `Resend in ${left}s` : "Resend link"}</button>
        </div>
        {left === 0 && check}
      </div>
    );

  return (
    <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); void send(value); }}>
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-ink">University email
        <input type="email" inputMode="email" autoComplete="email" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} maxLength={254} placeholder="you@st.ug.edu.gh" aria-invalid={!!error} className={`${fieldCls} h-[52px]! rounded-[14px]! text-[17px]!`} />
      </label>
      {check}
      {error && <p className="m-0 text-[14px] text-plum" role="alert">{error}</p>}
      <button type="submit" disabled={busy || !value.trim() || !token} className="h-[52px] rounded-full bg-blue px-4 text-[17px] font-semibold text-white hover:bg-blue-press disabled:opacity-50">{busy ? "Sending…" : cta}</button>
      <details className="text-[14px] text-muted">
        <summary className="cursor-pointer">Supported universities</summary>
        <p className="m-0 mt-1.5">{UNIVERSITIES.map((u) => u.name).join(", ")}. Not listed? Email notifiedlaw@gmail.com.</p>
      </details>
    </form>
  );
}
