"use client";

import Link from "next/link";
import { useState } from "react";
import { Btn } from "@/components/ui";

const fmt = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Africa/Accra" }).format(new Date(ms));

export function Confirm({ token }: { token: string }) {
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "done"; trialEndsAt: number | null; trial: boolean } | { kind: "error"; message: string }>(
    token ? { kind: "idle" } : { kind: "error", message: "This link is not valid. Send a new one from Settings." },
  );
  const confirm = async () => {
    setState({ kind: "busy" });
    const res = await fetch("/api/uni-email/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { error?: string; trialEndsAt?: number | null } | null;
    if (res?.ok) { const ends = body?.trialEndsAt ?? null; setState({ kind: "done", trialEndsAt: ends, trial: !!ends && ends > Date.now() }); }
    else setState({ kind: "error", message: body?.error ?? "Could not reach NotifiedLaw. Check your connection and try again." });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl bg-surface p-6 text-center shadow-card sm:p-8">
        <div className="text-xl"><span className="font-bold">Notified</span><span className="text-amber">Law</span></div>
        {state.kind === "done" ? (
          <>
            <h1 className="m-0 text-2xl font-bold tracking-[-0.02em]">Email confirmed</h1>
            <p className="m-0 text-[15px] text-muted">
              {state.trial && state.trialEndsAt
                ? `Your Senior Judicial (Pro) trial runs until ${fmt(state.trialEndsAt)}.`
                : "Your university email is linked to your account."}
            </p>
            <Btn href="/dashboard" className="self-center">Go to NotifiedLaw</Btn>
          </>
        ) : state.kind === "error" ? (
          <>
            <h1 className="m-0 text-2xl font-bold tracking-[-0.02em]">Could not confirm</h1>
            <p className="m-0 text-[15px] text-muted" role="alert">{state.message}</p>
            <Btn href="/settings" tone="plain" className="self-center">Open Settings</Btn>
          </>
        ) : (
          <>
            <h1 className="m-0 text-2xl font-bold tracking-[-0.02em]">Confirm your university email</h1>
            <p className="m-0 text-[15px] text-muted">This links the address to your NotifiedLaw account and starts your 7-day Senior Judicial (Pro) trial.</p>
            <Btn onClick={() => void confirm()} disabled={state.kind === "busy"} className="self-center">{state.kind === "busy" ? "Confirming…" : "Confirm email"}</Btn>
          </>
        )}
        <Link href="/" className="text-[13px] text-muted">notifiedlaw.com</Link>
      </div>
    </div>
  );
}
