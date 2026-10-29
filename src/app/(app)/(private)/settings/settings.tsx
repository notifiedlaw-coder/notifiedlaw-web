"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlan } from "@/components/plan";
import { useTheme, type Theme } from "@/components/theme";
import { Btn, Eyebrow, Initials, LevelSelect, Page, Segmented } from "@/components/ui";
import { DEMO_BILLING } from "@/lib/site";
import { useUser } from "@/components/user";
import { authClient } from "@/lib/auth-client";
import { ProfileForm } from "./profile-form";
import { CREDIT_NAME, PLAN_NAMES, PLANS } from "@/lib/data";
import { STUDENT_VERIFY_DAYS } from "@/lib/student";

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5"><Eyebrow>{title}</Eyebrow><div className="overflow-hidden rounded-xl bg-surface shadow-card">{children}</div></section>
);
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-h-11 items-center justify-between gap-4 border-t border-edge/[0.06] px-4 py-2 text-sm first:border-0"><span className="font-medium">{label}</span><span>{children}</span></div>
);

const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(ms));

export function Settings() {
  const { plan, setPlan, credits, allowance, profile, setLevel, student } = usePlan();
  const { theme, setTheme } = useTheme();
  const user = useUser();

  return (
    <Page max={640}>
      <div className="flex items-center gap-4">
        <Initials name={user.name} color="#FF9500" size={64} />
        <div><div className="text-xl font-bold">{user.name}</div><div className="text-[13px] text-muted">{user.email}</div></div>
      </div>
      <Group title="Reading level">
        <Row label="Level"><LevelSelect value={profile?.level || "200"} onChange={setLevel} /></Row>
      </Group>
      {profile && <ProfileForm profile={profile} />}
      {student && (
        <Group title="Student">
          <Row label="University">{student.university}</Row>
          <Row label="Student ID">{student.studentId || "Not set"}</Row>
          <Row label="Verified until">{student.eligible ? fmtDate(student.verifiedAt + STUDENT_VERIFY_DAYS * 86_400_000) : "Expired, sign in again with your university email"}</Row>
        </Group>
      )}
      <Group title="Subscription">
        <Row label="Current plan">{PLAN_NAMES[plan]}</Row>
        <Row label={CREDIT_NAME}>{credits} available{allowance > 0 ? ` · ${allowance} monthly` : ""}</Row>
        <Row label="Payment method">MTN MoMo · •• •• 0123</Row>
        <Link href="/plans" className="block border-t border-edge/[0.06] px-4 py-3 text-sm" style={{ textDecoration: "none" }}>Change plan</Link>
      </Group>
      <Group title="Appearance">
        <Row label="Theme"><Segmented options={["system", "light", "dark"] as readonly Theme[]} value={theme} onChange={setTheme} labels={{ system: "System", light: "Light", dark: "Dark" }} /></Row>
      </Group>
      {DEMO_BILLING && (
        <Group title="Demo">
          <Row label="Preview as plan"><Segmented options={PLANS} value={plan} onChange={setPlan} labels={{ None: "Unpaid", "Pro Max": "Max" }} /></Row>
        </Group>
      )}
      <DeleteAccount />
      <button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })} className="cursor-pointer rounded-xl border-0 bg-surface py-3 text-center text-sm font-medium text-red shadow-card" style={{ color: "#FF3B30" }}>Sign Out</button>
    </Page>
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
      <div className="flex flex-col gap-3 px-4 py-3 text-sm">
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
