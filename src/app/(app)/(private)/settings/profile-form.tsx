"use client";

import { useState } from "react";
import { usePlan } from "@/components/plan";
import { Btn, Eyebrow } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { UNIVERSITIES } from "@/lib/content";
import { GENDERS, GOALS, MIN_AGE, latestDob, type Profile } from "@/lib/profile";

const field = "h-11 rounded-[10px] bg-fill px-3.5 text-[15px] outline-none";
const label = "flex flex-col gap-1 text-xs font-semibold text-muted";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { setProfile } = usePlan();
  const [f, setF] = useState(profile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const set = (k: "firstName" | "middleName" | "lastName" | "dob" | "phone") => (e: React.ChangeEvent<HTMLInputElement>) => { setStatus("idle"); setF((p) => ({ ...p, [k]: e.target.value })); };
  const dobError = f.dob && f.dob > latestDob() ? `You must be at least ${MIN_AGE}.` : "";
  // Level is edited in the Studies group, so it always comes from the live profile.
  const dirty = JSON.stringify({ ...f, level: 0 }) !== JSON.stringify({ ...profile, level: 0 });
  const valid = f.firstName.trim() && f.lastName.trim() && f.dob && !dobError;

  const save = async () => {
    setStatus("saving");
    setError("");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, level: profile.level }) }).catch(() => null);
    if (!res?.ok) {
      setStatus("idle");
      setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not save. Check your connection and try again.");
      return;
    }
    const saved = { ...f, level: profile.level, firstName: f.firstName.trim(), middleName: f.middleName.trim(), lastName: f.lastName.trim(), phone: f.phone.trim() };
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
          <label className={label}>First name<input value={f.firstName} onChange={set("firstName")} autoComplete="given-name" className={field} /></label>
          <label className={label}>Last name<input value={f.lastName} onChange={set("lastName")} autoComplete="family-name" className={field} /></label>
        </div>
        <label className={label}>Middle name(s) <span className="font-normal">(optional)</span><input value={f.middleName} onChange={set("middleName")} autoComplete="additional-name" className={field} /></label>
        <label className={label}>Date of birth<input type="date" value={f.dob} max={new Date().toISOString().slice(0, 10)} onChange={set("dob")} autoComplete="bday" className={field} />{dobError && <span className="font-normal text-red">{dobError}</span>}</label>
        <label className={label}>Gender
          <select value={f.gender} onChange={(e) => { setStatus("idle"); setF((p) => ({ ...p, gender: e.target.value })); }} className={field}>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
        <label className={label}>Phone number <span className="font-normal">(optional, for MoMo payments)</span><input type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" className={field} /></label>
        <label className={label}>University
          <select value={f.university} onChange={(e) => { setStatus("idle"); setF((p) => ({ ...p, university: e.target.value })); }} className={field}>{UNIVERSITIES.map((u) => <option key={u.name}>{u.name}</option>)}</select>
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-muted">Interests
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
