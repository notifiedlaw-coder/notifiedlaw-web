"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const BULLETS = ["Notes for every Level", "Hot Topics podcast write-ups", "Case briefs, articles and exam prep"];
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
      <div className="relative flex flex-col justify-end overflow-hidden bg-ink-dark px-5 py-5 text-white sm:px-8 md:min-h-dvh md:p-14">
        {/* Variants live in R2 under images/; the face sits high in the frame, so crop from the top. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/images/barrister-768.webp"
          srcSet="/media/images/barrister-480.webp 480w, /media/images/barrister-768.webp 768w, /media/images/barrister-1034.webp 1034w"
          sizes="(min-width: 768px) 53vw, 100vw"
          alt=""
          width={1034}
          height={1520}
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-[50%_15%]"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(28,28,30,0.2) 0%, rgba(28,28,30,0.75) 45%, rgba(28,28,30,0.97) 100%)" }} />
        <div className="relative flex flex-col gap-2 md:gap-4">
          <Link href="/" aria-label="NotifiedLaw home" className="w-fit text-[17px] font-semibold" style={{ color: "#fff", textDecoration: "none" }}>Notified<span className="font-normal text-amber-soft">Law</span></Link>
          <h1 className="text-balance text-[26px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-3xl md:text-6xl md:tracking-[-0.045em]">Ghanaian law, made learnable.</h1>
          <ul className="hidden flex-col gap-2 text-[15px] text-white/80 md:flex">
            {BULLETS.map((b) => <li key={b} className="flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-amber-soft" />{b}</li>)}
          </ul>
        </div>
      </div>
      <div className="relative flex items-start justify-center bg-surface px-5 py-6 sm:px-6 md:items-center md:py-10">
        <Link href="/" className="absolute right-5 top-5 hidden text-sm font-medium md:block" style={{ color: "var(--color-blue)", textDecoration: "none" }}>← Back to home</Link>
        <div className="flex w-full max-w-[360px] flex-col gap-3">
          <h2 className="text-xl font-bold md:text-2xl tracking-[-0.02em]">{login ? "Sign in to NotifiedLaw" : "Create your account"}</h2>
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
