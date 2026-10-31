"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusPicker, StatusQuestions, fieldCls, labelCls } from "@/components/profile-fields";
import { authClient } from "@/lib/auth-client";
import { LEVEL_LABEL } from "@/lib/data";
import { GENDERS, GOALS, MIN_DOB, isLevel, profileErrors, type ProfileInput } from "@/lib/profile";
import { normalizeStudentId } from "@/lib/student";

type StepKey = "about" | "status" | "more" | "studies" | "goals";
const STEP_TEXT: Record<StepKey, readonly [string, string]> = {
  about: ["Tell us about you", "Use your name exactly as it appears on your government-issued ID."],
  status: ["Which fits you best?", "This decides what we ask next."],
  more: ["A little more about you", "All optional. Skip anything you like."],
  studies: ["Your studies", "We use your student ID to keep the Student plan to one account per student."],
  goals: ["What do you want to use first?", "Pick as many as you like."],
};
// Student accounts already told us who they are by verifying a university email, so they skip the status step.
const PRO_STEPS: StepKey[] = ["about", "status", "more", "goals"];
const STUDENT_STEPS: StepKey[] = ["about", "studies", "goals"];
const FOLLOW_UP: Record<ProfileInput["status"], string> = {
  student: "Where do you study?", employed: "Tell us about your work", exploring: "What brings you here?",
};
const ABOUT_KEYS = ["firstName", "middleName", "lastName", "dob", "gender", "phone"] as const;

export function Onboarding({ defaults, student }: { defaults: { first: string; middle: string; last: string }; student: { university: string; email: string } | null }) {
  const router = useRouter();
  const steps = student ? STUDENT_STEPS : PRO_STEPS;
  const [step, setStep] = useState(0);
  const key = steps[step];
  const [studentId, setStudentId] = useState("");
  const [f, setF] = useState<ProfileInput>({
    firstName: defaults.first, middleName: defaults.middle, lastName: defaults.last, dob: "", gender: "", phone: "",
    status: (student ? "student" : "") as ProfileInput["status"], university: student?.university ?? "", level: "", jobTitle: "", employer: "", sector: "", intent: "",
    goals: ["Course notes", "Past questions"],
  });
  const patch = (p: Partial<ProfileInput>) => setF((x) => ({ ...x, ...p }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errors = profileErrors(f);
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const shown = (k: keyof typeof errors) => (touched[k] ? errors[k] : undefined);
  const err = (k: keyof typeof errors) => (shown(k) ? <span className="font-normal text-plum" role="alert">{shown(k)}</span> : null);
  const bad = (k: keyof typeof errors) => !!shown(k);
  const today = new Date().toISOString().slice(0, 10);
  const idError = student && !normalizeStudentId(studentId) ? "Enter your student ID: 4 to 20 letters, digits, / or -." : undefined;
  const levelError = student && !isLevel(f.level) ? "Choose your level." : undefined;
  const valid = key === "about" ? !ABOUT_KEYS.some((k) => errors[k]) : key === "status" ? !errors.status
    : key === "studies" ? !idError && !levelError : !Object.keys(errors).length;
  const pill = (on: boolean) => ({ background: on ? "var(--tint)" : "var(--surface)", boxShadow: on ? "0 0 0 2px var(--primary)" : "0 0 0 1px color-mix(in srgb, var(--ink) 15%, transparent)" });
  const text = (k: "firstName" | "middleName" | "lastName" | "phone" | "dob") => ({ value: f[k], onBlur: blur(k), "aria-invalid": bad(k), onChange: (e: React.ChangeEvent<HTMLInputElement>) => patch({ [k]: e.target.value }) });
  const cell = (k: StepKey) => `col-start-1 row-start-1 ${key === k ? "" : "invisible"}`;
  const last = step === steps.length - 1;

  const finish = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(student ? { ...f, studentId } : f) }).catch(() => null);
    if (res?.ok) {
      // The sidebar reads the account name, and student accounts start without one.
      await authClient.updateUser({ name: `${f.firstName.trim()} ${f.lastName.trim()}` }).catch(() => {});
      // Nothing opens without a plan yet, so go straight to choosing one.
      router.push("/plans");
      return;
    }
    setSaving(false);
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not save. Check your connection and try again.");
  };

  return (
    <div className="flex min-h-dvh items-start justify-center bg-canvas px-[18px] py-6 sm:items-center sm:px-5 sm:py-10">
      <div className="nl-scale flex w-full max-w-[600px] flex-col gap-5 sm:gap-7">
        <div className="flex gap-1.5">{steps.map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "var(--primary)" : "color-mix(in srgb, var(--ink) 12%, transparent)" }} />)}</div>
        <div className="min-h-[6rem] sm:min-h-[7.5rem]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Step {step + 1} of {steps.length}</div>
          <h1 className="m-0 mt-2 text-balance text-[36px] leading-[1.04] sm:text-[44px]">{key === "more" && f.status ? FOLLOW_UP[f.status] : STEP_TEXT[key][0]}</h1>
          <p className="m-0 mt-2 text-[16px] text-muted">{STEP_TEXT[key][1]}</p>
        </div>
        {/* Every step shares one grid cell, so the card keeps the height of the tallest step. */}
        <div className="grid">
        <div className={cell("about")}>
          <div className="flex flex-col gap-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>First name<input {...text("firstName")} maxLength={80} required autoComplete="given-name" className={fieldCls} />{err("firstName")}</label>
              <label className={labelCls}>Last name<input {...text("lastName")} maxLength={80} required autoComplete="family-name" className={fieldCls} />{err("lastName")}</label>
            </div>
            <label className={labelCls}><span>Middle name(s) <span className="font-normal text-muted">(optional)</span></span><input {...text("middleName")} maxLength={120} autoComplete="additional-name" className={fieldCls} />{err("middleName")}</label>
            <label className={labelCls}>Date of birth<input type="date" {...text("dob")} min={MIN_DOB} max={today} required autoComplete="bday" className={fieldCls} />{err("dob")}</label>
            <div className={labelCls} onBlur={blur("gender")}>Gender
              <div className="flex flex-wrap gap-2">{GENDERS.map((g) => <button key={g} type="button" aria-pressed={f.gender === g} onClick={() => patch({ gender: g })} className="h-11 rounded-full px-5 text-[15px] font-medium text-ink" style={pill(f.gender === g)}>{g}</button>)}</div>
              {err("gender")}
            </div>
            <label className={labelCls}><span>Phone number <span className="font-normal text-muted">(optional, for MoMo payments)</span></span><input type="tel" inputMode="tel" {...text("phone")} maxLength={30} placeholder="024 000 0000" autoComplete="tel" className={fieldCls} />{err("phone")}</label>
          </div>
        </div>
        {student ? (
          <div className={cell("studies")}>
            <div className="flex flex-col gap-3.5">
              <div className={labelCls}>University
                <div className="flex h-12 items-center justify-between gap-3 rounded-[14px] bg-fill px-4 text-[16px] font-normal">
                  <span className="truncate">{student.university}</span><span className="shrink-0 text-[13px] font-semibold text-green">Verified · {student.email}</span>
                </div>
              </div>
              <label className={labelCls}>Student ID<input value={studentId} onChange={(e) => setStudentId(e.target.value)} onBlur={blur("studentId")} aria-invalid={!!(touched.studentId && idError)} maxLength={24} autoComplete="off" placeholder="e.g. 10987654" className={fieldCls} />
                {touched.studentId && idError && <span className="font-normal text-plum" role="alert">{idError}</span>}
              </label>
              <label className={labelCls}>Level
                <select value={f.level} onChange={(e) => patch({ level: e.target.value as ProfileInput["level"] })} className={fieldCls}>
                  <option value="">Choose your level</option>
                  {Object.entries(LEVEL_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <>
            <div className={cell("status")}><StatusPicker value={f} onChange={patch} errors={touched.status ? errors : {}} /></div>
            <div className={cell("more")}><StatusQuestions value={f} onChange={patch} errors={errors} /></div>
          </>
        )}
        <div className={cell("goals")}><div className="flex flex-wrap gap-2">{GOALS.map((g) => <button key={g} type="button" aria-pressed={f.goals.includes(g)} onClick={() => patch({ goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g] })} className="h-12 rounded-full px-5 text-[16px] font-medium" style={pill(f.goals.includes(g))}>{g}</button>)}</div></div>
        </div>
        {error && <p className="m-0 text-[15px] text-plum">{error}</p>}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-[52px] rounded-full px-5 text-[16px] font-semibold text-link" style={{ visibility: step ? "visible" : "hidden" }}>‹ Back</button>
          <div className="flex items-center gap-2">
            {key === "more" && <button type="button" onClick={() => { patch({ university: "", level: "", jobTitle: "", employer: "", sector: "", intent: "" }); setStep(step + 1); }} className="h-[52px] rounded-full px-5 text-[16px] text-muted">Skip</button>}
            <button type="button" disabled={!valid || saving} onClick={() => { if (key === "status") setTouched((t) => ({ ...t, status: true })); if (last) void finish(); else setStep(step + 1); }} className="h-[52px] rounded-full bg-blue px-8 text-[17px] font-semibold text-white hover:bg-blue-press disabled:opacity-40">{last ? (saving ? "Saving…" : "Start studying") : "Continue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
