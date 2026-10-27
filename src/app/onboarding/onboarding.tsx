"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UNIVERSITIES } from "@/lib/content";

const STEPS = [
  ["Where do you study?", "We’ll show rankings against students at your university."],
  ["Which level are you in?", "We’ll open the right courses first."],
  ["What do you want to use first?", "Pick as many as you like."],
] as const;
const GOALS = ["AI summaries", "Flashcards", "Podcasts", "Past questions", "Case law"];

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uni, setUni] = useState(0);
  const [level, setLevel] = useState("200");
  const [goals, setGoals] = useState<string[]>(["AI summaries", "Flashcards"]);
  const pill = (on: boolean) => ({ background: on ? "rgba(0,122,255,0.08)" : "var(--surface)", boxShadow: on ? "0 0 0 2px #007AFF" : "0 0 0 0.5px var(--hairline)" });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10">
      <div className="flex w-full max-w-[560px] flex-col gap-6 rounded-3xl bg-surface p-8 shadow-card">
        <div className="flex gap-1.5">{STEPS.map((_, i) => <div key={i} className="h-1 flex-1 rounded-sm" style={{ background: i <= step ? "#007AFF" : "var(--track)" }} />)}</div>
        <div>
          <div className="text-xs font-semibold text-muted">Step {step + 1} of 3</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em]">{STEPS[step][0]}</h1>
          <p className="mt-1 text-sm text-muted">{STEPS[step][1]}</p>
        </div>
        {step === 0 && <div className="grid gap-2 sm:grid-cols-2">{UNIVERSITIES.map((u, i) => <button key={u.name} onClick={() => setUni(i)} className="rounded-xl px-3.5 py-3 text-left" style={pill(i === uni)}><div className="text-sm font-semibold">{u.name}</div><div className="text-xs text-muted">{u.city}</div></button>)}</div>}
        {step === 1 && <div className="grid grid-cols-3 gap-2">{[["100", "Year 1"], ["200", "Year 2"], ["300", "Year 3"], ["400", "Year 4"], ["pre-bar", "Before Law School"], ["bar", "Ghana School of Law"]].map(([n, y]) => <button key={n} onClick={() => setLevel(n)} className="rounded-xl py-5 text-center" style={pill(n === level)}><div className="text-3xl font-bold">{n === "pre-bar" ? "Pre-Bar" : n === "bar" ? "Bar" : n}</div><div className="text-xs text-muted">{y}</div></button>)}</div>}
        {step === 2 && <div className="flex flex-wrap gap-2">{GOALS.map((g) => <button key={g} onClick={() => setGoals((a) => a.includes(g) ? a.filter((x) => x !== g) : [...a, g])} className="rounded-full px-4 py-2 text-sm font-medium" style={pill(goals.includes(g))}>{g}</button>)}</div>}
        <div className="flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-10 rounded-[10px] px-4 text-sm text-muted" style={{ visibility: step ? "visible" : "hidden" }}>Back</button>
          <button onClick={() => (step < 2 ? setStep(step + 1) : router.push("/home"))} className="h-10 rounded-[10px] bg-blue px-6 text-sm font-semibold text-white">{step < 2 ? "Continue" : "Start studying"}</button>
        </div>
      </div>
    </div>
  );
}
