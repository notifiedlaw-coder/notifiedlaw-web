"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UNIVERSITIES } from "@/lib/content";

const STEPS = [
  ["Tell us about you", "Use your name exactly as it appears on your government-issued ID."],
  ["Where do you study?", "We’ll show rankings against students at your university."],
  ["Which level are you in?", "We’ll open the right courses first."],
  ["What do you want to use first?", "Pick as many as you like."],
] as const;
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const MIN_AGE = 16;
const field = "h-11 rounded-[10px] bg-fill px-3.5 text-[15px] outline-none";
const GOALS = ["AI summaries", "Flashcards", "Podcasts", "Past questions", "Case law"];

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [me, setMe] = useState({ first: "", middle: "", last: "", dob: "", gender: "", phone: "" });
  const set = (k: keyof typeof me) => (e: React.ChangeEvent<HTMLInputElement>) => setMe((m) => ({ ...m, [k]: e.target.value }));
  const [uni, setUni] = useState(0);
  const [level, setLevel] = useState("200");
  const [goals, setGoals] = useState<string[]>(["AI summaries", "Flashcards"]);
  const today = new Date().toISOString().slice(0, 10);
  // Born on or before this date means MIN_AGE today; comparing ISO dates avoids leap-year rounding.
  const latestDob = `${Number(today.slice(0, 4)) - MIN_AGE}${today.slice(4)}`;
  const dobError = me.dob && me.dob > latestDob ? `You must be at least ${MIN_AGE} to sign up.` : "";
  const valid = step !== 0 || (me.first.trim() && me.last.trim() && me.dob && !dobError && me.gender);
  const pill = (on: boolean) => ({ background: on ? "rgba(0,122,255,0.08)" : "var(--surface)", boxShadow: on ? "0 0 0 2px #007AFF" : "0 0 0 0.5px var(--hairline)" });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10">
      <div className="flex w-full max-w-[560px] flex-col gap-6 rounded-3xl bg-surface p-8 shadow-card">
        <div className="flex gap-1.5">{STEPS.map((_, i) => <div key={i} className="h-1 flex-1 rounded-sm" style={{ background: i <= step ? "#007AFF" : "var(--track)" }} />)}</div>
        <div>
          <div className="text-xs font-semibold text-muted">Step {step + 1} of {STEPS.length}</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">{STEPS[step][0]}</h1>
          <p className="mt-1 text-sm text-muted">{STEPS[step][1]}</p>
        </div>
        {step === 0 && (
          <div className="flex flex-col gap-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">First name<input value={me.first} onChange={set("first")} autoComplete="given-name" className={field} /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Last name<input value={me.last} onChange={set("last")} autoComplete="family-name" className={field} /></label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Middle name(s) <span className="font-normal">(optional)</span><input value={me.middle} onChange={set("middle")} autoComplete="additional-name" className={field} /></label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Date of birth<input type="date" value={me.dob} max={today} onChange={set("dob")} autoComplete="bday" className={field} />{dobError && <span className="font-normal text-red">{dobError}</span>}</label>
            <div className="flex flex-col gap-1 text-xs font-semibold text-muted">Gender
              <div className="flex flex-wrap gap-2">{GENDERS.map((g) => <button key={g} type="button" aria-pressed={me.gender === g} onClick={() => setMe((m) => ({ ...m, gender: g }))} className="rounded-full px-4 py-2 text-sm font-medium text-ink" style={pill(me.gender === g)}>{g}</button>)}</div>
            </div>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Phone number <span className="font-normal">(optional, for MoMo payments)</span><input type="tel" value={me.phone} onChange={set("phone")} placeholder="024 000 0000" autoComplete="tel" className={field} /></label>
          </div>
        )}
        {step === 1 && <div className="grid gap-2 sm:grid-cols-2">{UNIVERSITIES.map((u, i) => <button key={u.name} onClick={() => setUni(i)} className="rounded-xl px-3.5 py-3 text-left" style={pill(i === uni)}><div className="text-sm font-semibold">{u.name}</div><div className="text-xs text-muted">{u.city}</div></button>)}</div>}
        {step === 2 && <div className="grid grid-cols-3 gap-2">{[["100", "Year 1"], ["200", "Year 2"], ["300", "Year 3"], ["400", "Year 4"], ["pre-bar", "Before Law School"], ["bar", "Ghana School of Law"]].map(([n, y]) => <button key={n} onClick={() => setLevel(n)} className="rounded-xl py-5 text-center" style={pill(n === level)}><div className="text-3xl font-bold">{n === "pre-bar" ? "Pre-Bar" : n === "bar" ? "Bar" : n}</div><div className="text-xs text-muted">{y}</div></button>)}</div>}
        {step === 3 && <div className="flex flex-wrap gap-2">{GOALS.map((g) => <button key={g} onClick={() => setGoals((a) => a.includes(g) ? a.filter((x) => x !== g) : [...a, g])} className="rounded-full px-4 py-2 text-sm font-medium" style={pill(goals.includes(g))}>{g}</button>)}</div>}
        <div className="flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-10 rounded-[10px] px-4 text-sm text-muted" style={{ visibility: step ? "visible" : "hidden" }}>Back</button>
          <button disabled={!valid} onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : router.push("/home"))} className="h-10 rounded-[10px] bg-blue px-6 text-sm font-semibold text-white disabled:opacity-40">{step < STEPS.length - 1 ? "Continue" : "Start studying"}</button>
        </div>
      </div>
    </div>
  );
}
