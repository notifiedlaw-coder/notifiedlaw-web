"use client";

import { useState } from "react";
import { usePlan } from "@/components/plan";
import { Btn, Eyebrow } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { StatusPicker, StatusQuestions, fieldCls as field, labelCls as label } from "@/components/profile-fields";
import { GENDERS, GOALS, MIN_DOB, profileErrors, type Profile } from "@/lib/profile";


export function ProfileForm({ profile }: { profile: Profile }) {
  const { setProfile } = usePlan();
  const [f, setF] = useState(profile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const patch = (p: Partial<Profile>) => { setStatus("idle"); setF((x) => ({ ...x, ...p })); };
  const set = (k: "firstName" | "middleName" | "lastName" | "dob" | "phone") => (e: React.ChangeEvent<HTMLInputElement>) => { setStatus("idle"); setF((p) => ({ ...p, [k]: e.target.value })); };
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = profileErrors(f);
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] && errors[k] ? <span className="font-normal text-red" role="alert">{errors[k]}</span> : null);
  const bad = (k: keyof typeof errors) => !!(touched[k] && errors[k]);
  // Level is edited in the Studies group, so it always comes from the live profile.
  const dirty = JSON.stringify({ ...f, level: 0 }) !== JSON.stringify({ ...profile, level: 0 });
  const valid = Object.keys(errors).length === 0;

  const save = async () => {
    setStatus("saving");
    setError("");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, level: profile.level }) }).catch(() => null);
    if (!res?.ok) {
      setStatus("idle");
      setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not save. Check your connection and try again.");
      return;
    }
    const saved = ((await res.json().catch(() => null)) as { profile?: Profile } | null)?.profile ?? f;
    setProfile(saved);
    setF(saved);
    // The sidebar and header read the account name, so keep it in step with the profile.
    await authClient.updateUser({ name: `${saved.firstName} ${saved.lastName}` }).catch(() => {});
    setStatus("saved");
  };

  return (
    <section className="flex flex-col gap-1.5">
      <Eyebrow>Profile</Eyebrow>
      <div className="flex flex-col gap-3.5 rounded-xl bg-surface p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>First name<input value={f.firstName} onChange={set("firstName")} onBlur={blur("firstName")} maxLength={80} required aria-invalid={bad("firstName")} autoComplete="given-name" className={field} />{err("firstName")}</label>
          <label className={label}>Last name<input value={f.lastName} onChange={set("lastName")} onBlur={blur("lastName")} maxLength={80} required aria-invalid={bad("lastName")} autoComplete="family-name" className={field} />{err("lastName")}</label>
        </div>
        <label className={label}><span>Middle name(s) <span className="font-normal text-muted">(optional)</span></span><input value={f.middleName} onChange={set("middleName")} onBlur={blur("middleName")} maxLength={120} aria-invalid={bad("middleName")} autoComplete="additional-name" className={field} />{err("middleName")}</label>
        <label className={label}>Date of birth<input type="date" value={f.dob} min={MIN_DOB} max={new Date().toISOString().slice(0, 10)} onChange={set("dob")} onBlur={blur("dob")} required aria-invalid={bad("dob")} autoComplete="bday" className={field} />{err("dob")}</label>
        <label className={label}>Gender
          <select value={f.gender} onChange={(e) => { setStatus("idle"); setF((p) => ({ ...p, gender: e.target.value })); }} className={field}>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
        <label className={label}><span>Phone number <span className="font-normal text-muted">(optional, for MoMo payments)</span></span><input type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} onBlur={blur("phone")} maxLength={30} aria-invalid={bad("phone")} autoComplete="tel" className={field} />{err("phone")}</label>
        <div className={label}>Which fits you best?
          <StatusPicker value={f} onChange={patch} errors={errors} />
        </div>
        <StatusQuestions value={f} onChange={patch} errors={errors} />
        <div className={label}>Interests
          <div className="flex flex-wrap gap-2">{GOALS.map((g) => {
            const on = f.goals.includes(g);
            return <button key={g} type="button" aria-pressed={on} onClick={() => { setStatus("idle"); setF((p) => ({ ...p, goals: on ? p.goals.filter((x) => x !== g) : [...p.goals, g] })); }} className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink" style={{ background: on ? "rgba(0,122,255,0.08)" : "var(--surface)", boxShadow: on ? "0 0 0 2px #007AFF" : "0 0 0 0.5px var(--hairline)" }}>{g}</button>;
          })}</div>
        </div>
        {error && <p className="m-0 text-sm text-red">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          {status === "saved" && !dirty && <span className="text-[13px] text-muted">Saved</span>}
          <Btn onClick={() => void save()} disabled={!dirty || !valid || status === "saving"}>{status === "saving" ? "Saving…" : "Save changes"}</Btn>
        </div>
      </div>
    </section>
  );
}
