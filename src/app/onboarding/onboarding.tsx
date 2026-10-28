"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusPicker, StatusQuestions, fieldCls, labelCls } from "@/components/profile-fields";
import { GENDERS, GOALS, MIN_DOB, profileErrors, type ProfileInput } from "@/lib/profile";

const STEPS = [
  ["Tell us about you", "Use your name exactly as it appears on your government-issued ID."],
  ["Which fits you best?", "This decides what we ask next."],
  ["A little more about you", "All optional. Skip anything you like."],
  ["What do you want to use first?", "Pick as many as you like."],
] as const;
const FOLLOW_UP: Record<ProfileInput["status"], string> = {
  student: "Where do you study?", employed: "Tell us about your work", exploring: "What brings you here?",
};
const ABOUT_KEYS = ["firstName", "middleName", "lastName", "dob", "gender", "phone"] as const;

export function Onboarding({ defaults }: { defaults: { first: string; middle: string; last: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<ProfileInput>({
    firstName: defaults.first, middleName: defaults.middle, lastName: defaults.last, dob: "", gender: "", phone: "",
    status: "" as ProfileInput["status"], university: "", level: "", jobTitle: "", employer: "", sector: "", intent: "",
    goals: ["Course notes", "Past questions"],
  });
  const patch = (p: Partial<ProfileInput>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errors = profileErrors(f);
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const shown = (k: keyof typeof errors) => (touched[k] ? errors[k] : undefined);
  const err = (k: keyof typeof errors) => (shown(k) ? <span className="font-normal text-red" role="alert">{shown(k)}</span> : null);
  const bad = (k: keyof typeof errors) => !!shown(k);
  const today = new Date().toISOString().slice(0, 10);
  const valid = step === 0 ? !ABOUT_KEYS.some((k) => errors[k]) : step === 1 ? !errors.status : !Object.keys(errors).length;
  const pill = (on: boolean) => ({ background: on ? "rgba(0,122,255,0.08)" : "var(--surface)", boxShadow: on ? "0 0 0 2px #007AFF" : "0 0 0 0.5px var(--hairline)" });
  const text = (k: "firstName" | "middleName" | "lastName" | "phone" | "dob") => ({ value: f[k], onBlur: blur(k), "aria-invalid": bad(k), onChange: (e: React.ChangeEvent<HTMLInputElement>) => patch({ [k]: e.target.value }) });
  const cell = (i: number) => `col-start-1 row-start-1 ${step === i ? "" : "invisible"}`;
  const last = step === STEPS.length - 1;

  const finish = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    if (res?.ok) { router.push("/dashboard"); return; }
    setSaving(false);
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not save. Check your connection and try again.");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-3 py-3 sm:px-5 sm:py-10">
      <div className="flex w-full max-w-[560px] flex-col gap-4 rounded-3xl bg-surface p-5 sm:gap-6 sm:p-8 shadow-card">
        <div className="flex gap-1.5">{STEPS.map((_, i) => <div key={i} className="h-1 flex-1 rounded-sm" style={{ background: i <= step ? "#007AFF" : "var(--track)" }} />)}</div>
        <div className="min-h-[4.5rem] sm:min-h-[5.5rem]">
          <div className="text-xs font-semibold text-muted">Step {step + 1} of {STEPS.length}</div>
          <h1 className="mt-0.5 text-2xl font-bold sm:mt-1 sm:text-[28px] tracking-[-0.02em]">{step === 2 && f.status ? FOLLOW_UP[f.status] : STEPS[step][0]}</h1>
          <p className="mt-1 text-sm text-muted">{STEPS[step][1]}</p>
        </div>
        {/* Every step shares one grid cell, so the card keeps the height of the tallest step. */}
        <div className="grid">
        <div className={cell(0)}>
          <div className="flex flex-col gap-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>First name<input {...text("firstName")} maxLength={80} required autoComplete="given-name" className={fieldCls} />{err("firstName")}</label>
              <label className={labelCls}>Last name<input {...text("lastName")} maxLength={80} required autoComplete="family-name" className={fieldCls} />{err("lastName")}</label>
            </div>
            <label className={labelCls}><span>Middle name(s) <span className="font-normal text-muted">(optional)</span></span><input {...text("middleName")} maxLength={120} autoComplete="additional-name" className={fieldCls} />{err("middleName")}</label>
            <label className={labelCls}>Date of birth<input type="date" {...text("dob")} min={MIN_DOB} max={today} required autoComplete="bday" className={fieldCls} />{err("dob")}</label>
            <div className={labelCls} onBlur={blur("gender")}>Gender
              <div className="flex flex-wrap gap-2">{GENDERS.map((g) => <button key={g} type="button" aria-pressed={f.gender === g} onClick={() => patch({ gender: g })} className="rounded-full px-4 py-2 text-sm font-medium text-ink" style={pill(f.gender === g)}>{g}</button>)}</div>
              {err("gender")}
            </div>
            <label className={labelCls}><span>Phone number <span className="font-normal text-muted">(optional, for MoMo payments)</span></span><input type="tel" inputMode="tel" {...text("phone")} maxLength={30} placeholder="024 000 0000" autoComplete="tel" className={fieldCls} />{err("phone")}</label>
          </div>
        </div>
        <div className={cell(1)}><StatusPicker value={f} onChange={patch} errors={touched.status ? errors : {}} /></div>
        <div className={cell(2)}><StatusQuestions value={f} onChange={patch} errors={errors} /></div>
        <div className={cell(3)}><div className="flex flex-wrap gap-2">{GOALS.map((g) => <button key={g} type="button" aria-pressed={f.goals.includes(g)} onClick={() => patch({ goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g] })} className="rounded-full px-4 py-2 text-sm font-medium" style={pill(f.goals.includes(g))}>{g}</button>)}</div></div>
        </div>
        {error && <p className="m-0 text-sm text-red">{error}</p>}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-10 rounded-[10px] px-4 text-sm text-muted" style={{ visibility: step ? "visible" : "hidden" }}>Back</button>
          <div className="flex items-center gap-2">
            {step === 2 && <button type="button" onClick={() => { patch({ university: "", level: "", jobTitle: "", employer: "", sector: "", intent: "" }); setStep(3); }} className="h-10 rounded-[10px] px-4 text-sm text-muted">Skip</button>}
            <button type="button" disabled={!valid || saving} onClick={() => { if (step === 1) setTouched((t) => ({ ...t, status: true })); if (last) void finish(); else setStep(step + 1); }} className="h-10 rounded-[10px] bg-blue px-6 text-sm font-semibold text-white disabled:opacity-40">{last ? (saving ? "Saving…" : "Start studying") : "Continue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
