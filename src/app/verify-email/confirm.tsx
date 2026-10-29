"use client";

import Link from "next/link";
import { useState } from "react";
import { Btn } from "@/components/ui";

export function Confirm({ token, failed }: { token: string; failed: boolean }) {
  const [busy, setBusy] = useState(false);
  const bad = failed || !token;
  // A plain navigation, not fetch: Better Auth sets the session cookie on its redirect, then sends new
  // students to onboarding and returning ones on to the dashboard (onboarding forwards them).
  const confirm = () => {
    setBusy(true);
    const q = new URLSearchParams({ token, callbackURL: "/onboarding", errorCallbackURL: "/verify-email" });
    window.location.assign(`/api/auth/magic-link/verify?${q}`);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl bg-surface p-6 text-center shadow-card sm:p-8">
        <div className="text-xl"><span className="font-bold">Notified</span><span className="text-amber">Law</span></div>
        {bad ? (
          <>
            <h1 className="m-0 text-2xl font-bold tracking-[-0.02em]">This link has expired</h1>
            <p className="m-0 text-[15px] text-muted" role="alert">Links work once, for a short time. Ask for a new one with your university email.</p>
            <Btn href="/login" className="self-center">Get a new link</Btn>
          </>
        ) : (
          <>
            <h1 className="m-0 text-2xl font-bold tracking-[-0.02em]">Confirm your university email</h1>
            <p className="m-0 text-[15px] text-muted">This verifies you as a student and signs you in to NotifiedLaw on this device.</p>
            <Btn onClick={confirm} disabled={busy} className="self-center">{busy ? "Confirming…" : "Confirm and continue"}</Btn>
          </>
        )}
        <Link href="/" className="text-[13px] text-muted">notifiedlaw.com</Link>
      </div>
    </div>
  );
}
