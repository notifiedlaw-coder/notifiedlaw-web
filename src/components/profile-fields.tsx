"use client";

import { UNIVERSITIES } from "@/lib/content";
import { INTENTS, SECTORS, STATUSES, isLevel, type ProfileErrors, type ProfileInput } from "@/lib/profile";
import { LEVEL_LABEL } from "@/lib/data";

// Inputs sit inside their label, so they set their own colour and weight rather than inherit the label's.
export const fieldCls = "h-11 rounded-[10px] bg-surface px-3.5 text-[15px] font-normal text-ink shadow-[0_0_0_1px_var(--hairline)] outline-none focus:shadow-[0_0_0_2px_#23305C]";
export const labelCls = "flex flex-col gap-1.5 text-[13px] font-semibold text-ink";
const optional = <span className="font-normal text-muted"> (optional)</span>;

type Props = { value: ProfileInput; onChange: (patch: Partial<ProfileInput>) => void; errors: ProfileErrors };

/** "Which fits you best?": the one required answer that decides which questions come next. */
export function StatusPicker({ value, onChange, errors }: Props) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Which fits you best?">
      {STATUSES.map((s) => {
        const on = value.status === s.id;
        return (
          <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => onChange({ status: s.id })} className="rounded-xl px-4 py-3.5 text-left" style={{ background: on ? "var(--tint)" : "var(--surface)", boxShadow: on ? "0 0 0 2px #23305C" : "0 0 0 0.5px var(--hairline)" }}>
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
        <label className={labelCls}><span>University{optional}</span>
          {select("university", UNIVERSITIES.map((u) => ({ v: u.name, t: u.name })), "Choose your university", value.university)}{err(errors.university)}
        </label>
        <label className={labelCls}><span>Level{optional}</span>
          {select("level", Object.entries(LEVEL_LABEL).filter(([k]) => isLevel(k)).map(([v, t]) => ({ v, t })), "Choose your level", value.level)}{err(errors.level)}
        </label>
      </div>
    );
  if (value.status === "employed")
    return (
      <div className="flex flex-col gap-3.5">
        <label className={labelCls}><span>Job title{optional}</span><input value={value.jobTitle} onChange={(e) => onChange({ jobTitle: e.target.value })} maxLength={80} autoComplete="organization-title" className={fieldCls} />{err(errors.jobTitle)}</label>
        <label className={labelCls}><span>Employer{optional}</span><input value={value.employer} onChange={(e) => onChange({ employer: e.target.value })} maxLength={100} autoComplete="organization" className={fieldCls} />{err(errors.employer)}</label>
        <label className={labelCls}><span>Sector{optional}</span>
          {select("sector", SECTORS.map((s) => ({ v: s, t: s })), "Choose a sector", value.sector)}{err(errors.sector)}
        </label>
      </div>
    );
  if (value.status === "exploring")
    return (
      <label className={labelCls}><span>What brings you here?{optional}</span>
        {select("intent", INTENTS.map((s) => ({ v: s, t: s })), "Choose one", value.intent)}{err(errors.intent)}
      </label>
    );
  return null;
}
