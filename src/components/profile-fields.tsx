"use client";

import { UNIVERSITIES } from "@/lib/content";
import { INTENTS, SECTORS, STATUSES, isLevel, type ProfileErrors, type ProfileInput } from "@/lib/profile";
import { LEVEL_LABEL } from "@/lib/data";

export const fieldCls = "h-11 rounded-[10px] bg-fill px-3.5 text-[15px] outline-none";
export const labelCls = "flex flex-col gap-1 text-xs font-semibold text-muted";
const optional = <span className="font-normal"> (optional)</span>;

type Props = { value: ProfileInput; onChange: (patch: Partial<ProfileInput>) => void; errors: ProfileErrors };

/** "Which fits you best?": the one required answer that decides which questions come next. */
export function StatusPicker({ value, onChange, errors }: Props) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Which fits you best?">
      {STATUSES.map((s) => {
        const on = value.status === s.id;
        return (
          <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => onChange({ status: s.id })} className="rounded-xl px-4 py-3.5 text-left" style={{ background: on ? "rgba(0,122,255,0.08)" : "var(--surface)", boxShadow: on ? "0 0 0 2px #007AFF" : "0 0 0 0.5px var(--hairline)" }}>
            <div className="text-[15px] font-semibold">{s.label}</div>
            <div className="text-xs text-muted">{s.hint}</div>
          </button>
        );
      })}
      {errors.status && <span className="text-xs text-red" role="alert">{errors.status}</span>}
    </div>
  );
}

/** The optional follow-up questions for the chosen status. */
export function StatusQuestions({ value, onChange, errors }: Props) {
  const err = (m?: string) => (m ? <span className="font-normal text-red" role="alert">{m}</span> : null);
  const select = (k: "university" | "level" | "sector" | "intent", items: readonly { v: string; t: string }[], blank: string, current: string) => (
    <select value={current} onChange={(e) => onChange({ [k]: e.target.value } as Partial<ProfileInput>)} className={fieldCls}>
      <option value="">{blank}</option>
      {items.map((i) => <option key={i.v} value={i.v}>{i.t}</option>)}
    </select>
  );
  if (value.status === "student")
    return (
      <div className="flex flex-col gap-3.5">
        <label className={labelCls}>University{optional}
          {select("university", UNIVERSITIES.map((u) => ({ v: u.name, t: u.name })), "Choose your university", value.university)}{err(errors.university)}
        </label>
        <label className={labelCls}>Level{optional}
          {select("level", Object.entries(LEVEL_LABEL).filter(([k]) => isLevel(k)).map(([v, t]) => ({ v, t })), "Choose your level", value.level)}{err(errors.level)}
        </label>
      </div>
    );
  if (value.status === "employed")
    return (
      <div className="flex flex-col gap-3.5">
        <label className={labelCls}>Job title{optional}<input value={value.jobTitle} onChange={(e) => onChange({ jobTitle: e.target.value })} maxLength={80} autoComplete="organization-title" className={fieldCls} />{err(errors.jobTitle)}</label>
        <label className={labelCls}>Employer{optional}<input value={value.employer} onChange={(e) => onChange({ employer: e.target.value })} maxLength={100} autoComplete="organization" className={fieldCls} />{err(errors.employer)}</label>
        <label className={labelCls}>Sector{optional}
          {select("sector", SECTORS.map((s) => ({ v: s, t: s })), "Choose a sector", value.sector)}{err(errors.sector)}
        </label>
      </div>
    );
  if (value.status === "exploring")
    return (
      <label className={labelCls}>What brings you here?{optional}
        {select("intent", INTENTS.map((s) => ({ v: s, t: s })), "Choose one", value.intent)}{err(errors.intent)}
      </label>
    );
  return null;
}
