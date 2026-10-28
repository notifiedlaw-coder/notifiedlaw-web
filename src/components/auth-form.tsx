"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const BULLETS = ["Notes for every Level", "Listen to any note as a podcast", "Revise with flashcards and a personal AI tutor"];
const btn = "flex h-11 items-center justify-center rounded-[10px] text-[15px] font-medium";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const login = mode === "login";
  const next = login ? "/dashboard" : "/onboarding";
  const [busy, setBusy] = useState(false);
  const google = async () => {
    setBusy(true);
    // Both screens use Google; new users land in onboarding either way, and returning users skip it.
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next, newUserCallbackURL: "/onboarding" });
    if (error) setBusy(false);
  };
  return (
    <div className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <div className="relative flex min-h-[34dvh] flex-col justify-end overflow-hidden bg-ink-dark p-6 text-white sm:min-h-[40dvh] sm:p-8 md:min-h-dvh md:p-14">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/photos/balme-library.jpg)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(28,28,30,0.2) 0%, rgba(28,28,30,0.75) 45%, rgba(28,28,30,0.97) 100%)" }} />
        <div className="relative flex flex-col gap-4">
          <div className="text-[17px] font-semibold">Notified<span className="font-normal text-amber-soft">Law</span></div>
          <h1 className="text-balance text-[40px] font-bold leading-[1.02] tracking-[-0.045em] md:text-6xl">Ghanaian law, made learnable.</h1>
          <ul className="flex flex-col gap-2 text-[15px] text-white/80">
            {BULLETS.map((b) => <li key={b} className="flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-amber-soft" />{b}</li>)}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center bg-surface px-6 py-10">
        <div className="flex w-full max-w-[360px] flex-col gap-3">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">{login ? "Sign in to NotifiedLaw" : "Create your account"}</h2>
          <p className="text-sm text-muted">Use your student email to get 7 days of Supreme Justice (Max) free.</p>
          <button type="button" onClick={google} disabled={busy} className={`${btn} mt-2 cursor-pointer border-0 bg-surface shadow-[0_0_0_0.5px_var(--hairline)] disabled:opacity-60`} style={{ color: "var(--ink)" }}>{busy ? "Redirecting to Google…" : "Continue with Google"}</button>
          <p className="text-center text-sm text-muted">
            {login ? "New here? " : "Already have an account? "}
            <Link href={login ? "/signup" : "/login"} style={{ color: "var(--color-blue)" }}>{login ? "Create an account" : "Sign in"}</Link>
          </p>
          <p className="text-center text-xs text-muted">By continuing you agree to the <Link href="/terms-of-service" style={{ color: "var(--color-blue)" }}>Terms</Link> and <Link href="/privacy" style={{ color: "var(--color-blue)" }}>Privacy Policy</Link>.</p>
        </div>
      </div>
    </div>
  );
}
