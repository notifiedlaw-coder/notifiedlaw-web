"use client";

import { Roboto } from "next/font/google";
import Link from "next/link";
import { useState } from "react";
import { StudentEmailForm } from "@/components/student-email-form";
import { LogoMark, Wordmark } from "@/components/app-shell";
import { authClient } from "@/lib/auth-client";
import { PLAN_PRICES, cedis } from "@/lib/content";

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

type Path = "choose" | "student" | "professional";

/** `elsewhere`: this device was signed out because the account signed in on another one (src/lib/auth.ts). */
export default function AuthForm({ mode, elsewhere = false }: { mode: "login" | "signup"; elsewhere?: boolean }) {
  const login = mode === "login";
  const [path, setPath] = useState<Path>(login ? "professional" : "choose");
  const [busy, setBusy] = useState(false);
  const google = async () => {
    setBusy(true);
    // New users land in onboarding; returning users go to the dashboard.
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard", newUserCallbackURL: "/onboarding" });
    if (error) setBusy(false);
  };
  const googleBtn = (
    <button type="button" onClick={google} disabled={busy} className={`google-btn ${roboto.className} flex h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-4 text-[16px] disabled:opacity-60`}>
      <GoogleG />
      {busy ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
  const back = <button type="button" onClick={() => setPath("choose")} className="self-start text-[15px] font-semibold text-link">‹ Back</button>;
  const h = "m-0 text-[40px] leading-[1.02] md:text-[44px]";
  const lede = "m-0 text-[16px] leading-normal text-muted";

  let body: React.ReactNode;
  if (login) {
    body = (
      <>
        <h2 className={h}>Welcome.</h2>
        <p className={lede}>Professionals sign in with Google. Students use their university email.</p>
        {googleBtn}
        <div className="my-1 flex items-center gap-3 text-[13px] text-faint"><span className="h-px flex-1 bg-edge/10" />Students<span className="h-px flex-1 bg-edge/10" /></div>
        <StudentEmailForm cta="Email me a sign-in link" />
      </>
    );
  } else if (path === "choose") {
    body = (
      <>
        <h2 className={h}>Welcome.</h2>
        <p className={lede}>Which describes you?</p>
        <div className="flex flex-col gap-2.5">
          {([
            ["student", "I’m a student", `Student plan from ${cedis(PLAN_PRICES.Student)} a month. Needs your university email.`],
            ["professional", "I’m a professional", "Senior Judicial (Pro) or Supreme Justice (Max). Sign up with Google."],
          ] as const).map(([id, title, hint]) => (
            <button key={id} type="button" onClick={() => setPath(id)} className="rounded-[18px] border border-edge/15 bg-surface px-5 py-4 text-left hover:border-transparent hover:shadow-[0_0_0_2px_var(--primary)]">
              <div className="font-display text-[24px] leading-tight">{title}</div>
              <div className="mt-1 text-[14px] text-muted">{hint}</div>
            </button>
          ))}
        </div>
      </>
    );
  } else if (path === "student") {
    body = (
      <>
        {back}
        <h2 className={h}>Verify you’re a student.</h2>
        <p className={lede}>Enter the email your university gave you. We’ll send a link to confirm it, then you’ll set up your profile and choose your plan.</p>
        <StudentEmailForm cta="Send verification link" />
      </>
    );
  } else {
    body = (
      <>
        {back}
        <h2 className={h}>Sign up as a professional.</h2>
        <p className={lede}>Continue with your Google account, set up your profile, then choose Senior Judicial (Pro) or Supreme Justice (Max).</p>
        {googleBtn}
      </>
    );
  }

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
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,26,38,0.15) 0%, rgba(22,26,38,0.7) 45%, rgba(22,26,38,0.96) 100%)" }} />
        <div className="relative flex flex-col gap-2 md:gap-4">
          <Link href="/" aria-label="NotifiedLaw home" className="w-fit" style={{ color: "#F6F5F2", textDecoration: "none" }}><Wordmark className="text-[24px] md:text-[28px]" /></Link>
          <h1 className="m-0 text-balance text-[30px] leading-[1.02] sm:text-[38px] md:text-[60px]">Ghanaian law, made learnable.</h1>
          <ul className="m-0 hidden list-none flex-col gap-2 p-0 text-[16px] text-[#CFD3DE] md:flex">
            {BULLETS.map((b) => <li key={b} className="flex items-center gap-2.5"><span aria-hidden className="size-1.5 rounded-full bg-amber-soft" />{b}</li>)}
          </ul>
        </div>
      </div>
      <main id="main" tabIndex={-1} className="nl-scale relative flex items-start justify-center bg-canvas px-[18px] py-8 sm:px-6 md:items-center md:py-10">
        <Link href="/" className="absolute right-6 top-6 hidden text-[15px] font-semibold md:block" style={{ color: "var(--color-link)", textDecoration: "none" }}>‹ Back to home</Link>
        <div className="flex w-full max-w-[400px] flex-col gap-4">
          <Link href="/" aria-label="NotifiedLaw home" className="mb-2 hidden w-fit items-center gap-2.5 text-ink! no-underline md:flex">
            <LogoMark />
            <Wordmark className="text-[26px]" />
          </Link>
          {elsewhere && (
            <p role="status" className="m-0 rounded-[18px] bg-tint p-4 text-[15px]">
              <b>You were signed out because you signed in on another device.</b> An account can be signed in on one device at a time. Sign in again to use NotifiedLaw here; that signs out the other device.
            </p>
          )}
          {body}
          <p className="m-0 text-center text-[15px] text-muted">
            {login ? "New here? " : "Already have an account? "}
            <Link href={login ? "/signup" : "/login"} className="font-semibold" style={{ color: "var(--color-link)" }}>{login ? "Create an account" : "Sign in"}</Link>
          </p>
          <p className="m-0 text-center text-[13px] text-faint">By continuing you agree to the <Link href="/terms-of-service" style={{ color: "var(--color-link)" }}>Terms</Link> and <Link href="/privacy" style={{ color: "var(--color-link)" }}>Privacy Policy</Link>.</p>
        </div>
      </main>
    </div>
  );
}
