"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar, uploadPhoto } from "@/components/avatar";
import { usePlan } from "@/components/plan";
import { useTheme, type Theme } from "@/components/theme";
import { Btn, Eyebrow, LevelSelect, Page, Segmented } from "@/components/ui";
import { DEMO_BILLING } from "@/lib/site";
import { useUser } from "@/components/user";
import { authClient } from "@/lib/auth-client";
import { ProfileForm } from "./profile-form";
import { CREDIT_NAME, PLAN_NAMES, PLANS } from "@/lib/data";
import { STUDENT_VERIFY_DAYS } from "@/lib/student";

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2"><div className="pl-1"><Eyebrow>{title}</Eyebrow></div><div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">{children}</div></section>
);
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-h-14 items-center justify-between gap-3 border-t border-edge/[0.07] px-[18px] py-2.5 text-[16px] first:border-0"><span>{label}</span><span className="min-w-0 text-right text-[15px] text-muted">{children}</span></div>
);

/** An iOS-style switch. */
const Switch = ({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
    className={`relative h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors duration-200 ${on ? "bg-green" : "bg-edge/20"}`}>
    <span className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-200 ${on ? "translate-x-[20px]" : ""}`} />
  </button>
);

const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(ms));

export function Settings() {
  const { plan, setPlan, credits, allowance, profile, setLevel, student, findByEmail, setFindByEmail } = usePlan();
  const { theme, setTheme } = useTheme();
  const user = useUser();

  return (
    <Page max={680}>
      <ProfilePhoto name={user.name} email={user.email} />
      <Group title="Profile">
        <Row label="Level"><LevelSelect value={profile?.level || "200"} onChange={setLevel} /></Row>
        {profile && <ProfileForm profile={profile} />}
      </Group>
      {student && (
        <Group title="Student">
          <Row label="University">{student.university}</Row>
          <Row label="Student ID">{student.studentId || "Not set"}</Row>
          <Row label="Verified until">{student.eligible ? fmtDate(student.verifiedAt + STUDENT_VERIFY_DAYS * 86_400_000) : "Expired, sign in again with your university email"}</Row>
        </Group>
      )}
      {profile && (
        <section className="flex flex-col gap-1.5">
          <Group title="Friends">
            <Row label="Find me by email"><Switch on={findByEmail} onChange={setFindByEmail} label="Find me by email" /></Row>
          </Group>
          <p className="m-0 px-1 text-[14px] text-muted">When this is off, someone who types your email is told no account uses it. People you already have a request with can still reach you.</p>
        </section>
      )}
      <Group title="Plan">
        <Row label={PLAN_NAMES[plan]}><Link href="/plans" className="font-bold text-blue" style={{ textDecoration: "none" }}>Manage</Link></Row>
        <Row label={CREDIT_NAME}>{credits} available{allowance > 0 ? ` · ${allowance} monthly` : ""}</Row>
        <Row label="Payment method">MTN MoMo · •• •• 0123</Row>
      </Group>
      <section className="flex flex-col gap-2">
        <div className="pl-1"><Eyebrow>Appearance</Eyebrow></div>
        <Segmented options={["light", "dark", "system"] as readonly Theme[]} value={theme} onChange={setTheme} labels={{ system: "System", light: "Light", dark: "Dark" }} />
      </section>
      {DEMO_BILLING && (
        <Group title="Demo">
          <Row label="Preview as plan"><Segmented options={PLANS} value={plan} onChange={setPlan} labels={{ None: "Unpaid", "Pro Max": "Max" }} /></Row>
        </Group>
      )}
      <DeleteAccount />
      <button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })} className="h-[52px] cursor-pointer rounded-full border border-plum/40 bg-transparent text-center text-[16px] font-semibold text-plum hover:bg-plum/5">Sign out</button>
    </Page>
  );
}

/** The profile picture: the only place it is added, changed or removed. The server keeps a 256 px WebP. */
function ProfilePhoto({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { avatar: saved, plan } = usePlan();
  const [avatar, setAvatar] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  async function choose(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setError("");
    const r = await uploadPhoto("/api/avatars", f);
    setBusy(false);
    if ("error" in r) return setError(r.error);
    setAvatar(r.avatar);
    router.refresh(); // the sidebar's picture
  }
  async function remove() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/avatars", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError("The picture was not removed. Try again.");
    setAvatar(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-5 pt-2">
      <button type="button" onClick={() => file.current?.click()} disabled={busy} aria-label={avatar ? "Change your profile picture" : "Add a profile picture"} className="relative shrink-0 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-50">
        <Avatar id={email} name={name} src={avatar} plan={plan} size={64} />
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-blue text-white ring-2 ring-canvas">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M8 3v10M3 8h10" /></svg>
        </span>
      </button>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate font-display text-[34px] leading-[1.1]">{name}</div>
        <div className="truncate text-[15px] text-faint">{email}</div>
        {busy ? <span className="text-[13px] text-muted">Saving picture…</span>
          : <span className="flex gap-3 text-[13px]">
            <button type="button" onClick={() => file.current?.click()} className="cursor-pointer border-0 bg-transparent p-0 text-link">{avatar ? "Change picture" : "Add picture"}</button>
            {avatar && <button type="button" onClick={() => void remove()} className="cursor-pointer border-0 bg-transparent p-0 text-red">Remove</button>}
          </span>}
        {error && <span role="alert" className="text-[13px] text-red">{error}</span>}
      </div>
    </div>
  );
}

/** Deletes the account and everything stored with it, after a second click. */
function DeleteAccount() {
  const [stage, setStage] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState("");
  const go = async () => {
    setStage("busy");
    setError("");
    const { error: e } = await authClient.deleteUser().catch(() => ({ error: { code: "", message: "" } }));
    if (!e) { window.location.assign("/"); return; }
    setStage("confirm");
    setError(e.code === "SESSION_EXPIRED" ? "For your safety, sign out and sign in again, then delete your account within a day." : "Could not delete your account. Try again.");
  };
  return (
    <Group title="Delete account">
      <div className="flex flex-col gap-3 px-[18px] py-4 text-[15px]">
        <p className="m-0 text-muted">Deletes your profile, plan, {CREDIT_NAME} and every file in My Files. This cannot be undone.</p>
        {stage === "idle" ? (
          <div><Btn tone="plain" onClick={() => setStage("confirm")}>Delete account…</Btn></div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Delete your account and all your files?</span>
            <Btn onClick={() => void go()} disabled={stage === "busy"} className="!bg-red">{stage === "busy" ? "Deleting…" : "Delete forever"}</Btn>
            <Btn tone="plain" onClick={() => { setStage("idle"); setError(""); }} disabled={stage === "busy"}>Keep account</Btn>
          </div>
        )}
        {error && <p role="alert" className="m-0 text-red">{error}</p>}
      </div>
    </Group>
  );
}
