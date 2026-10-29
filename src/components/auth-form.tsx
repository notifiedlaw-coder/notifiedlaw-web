"use client";

import { Roboto } from "next/font/google";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const BULLETS = ["Notes for every Level", "Hot Topics podcast write-ups", "Case briefs, articles and exam prep"];
// Google's sign-in branding asks for Roboto Medium on the button.
const roboto = Roboto({ weight: "500", subsets: ["latin"], display: "swap" });

// The standard multicolour "G" from Google's sign-in branding guidelines.
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

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
            {BULLETS.map((b) => <li key={b} className="flex items-center gap-2.5"><span aria-hidden className="size-1.5 rounded-full bg-amber-soft" />{b}</li>)}
          </ul>
        </div>
      </div>
      <main id="main" tabIndex={-1} className="relative flex items-start justify-center bg-surface px-5 py-6 sm:px-6 md:items-center md:py-10">
        <Link href="/" className="absolute right-5 top-5 hidden text-sm font-medium md:block" style={{ color: "var(--color-link)", textDecoration: "none" }}>← Back to home</Link>
        <div className="flex w-full max-w-[360px] flex-col gap-3">
          <h2 className="text-xl font-bold md:text-2xl tracking-[-0.02em]">{login ? "Sign in to NotifiedLaw" : "Create your account"}</h2>
          <p className="text-sm text-muted">Use your student email to get a 7-day Senior Judicial (Pro) trial.</p>
          <button type="button" onClick={google} disabled={busy} className={`google-btn ${roboto.className} mt-2 flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-full px-4 text-[15px] disabled:opacity-60`}>
            <GoogleG />
            {busy ? "Redirecting to Google…" : "Continue with Google"}
          </button>
          <p className="text-center text-sm text-muted">
            {login ? "New here? " : "Already have an account? "}
            <Link href={login ? "/signup" : "/login"} style={{ color: "var(--color-link)" }}>{login ? "Create an account" : "Sign in"}</Link>
          </p>
          <p className="text-center text-xs text-muted">By continuing you agree to the <Link href="/terms-of-service" style={{ color: "var(--color-link)" }}>Terms</Link> and <Link href="/privacy" style={{ color: "var(--color-link)" }}>Privacy Policy</Link>.</p>
        </div>
      </main>
    </div>
  );
}
