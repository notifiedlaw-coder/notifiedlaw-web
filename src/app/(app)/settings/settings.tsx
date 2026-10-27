"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlan } from "@/components/plan";
import { useTheme, type Theme } from "@/components/theme";
import { Eyebrow, Initials, Page, Segmented } from "@/components/ui";
import { CREDIT_NAME, DEMO_USER, LEVEL_SHORT, LEVELS, PLAN_NAMES, type Level, type Plan } from "@/lib/data";

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5"><Eyebrow>{title}</Eyebrow><div className="overflow-hidden rounded-xl bg-surface shadow-card">{children}</div></section>
);
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-h-11 items-center justify-between gap-4 border-t border-edge/[0.06] px-4 py-2 text-sm first:border-0"><span>{label}</span><span className="text-muted">{children}</span></div>
);

export function Settings() {
  const { plan, setPlan, credits, allowance, extra } = usePlan();
  const { theme, setTheme } = useTheme();
  const [level, setLevel] = useState<Level>(DEMO_USER.level);

  return (
    <Page max={640}>
      <div className="flex items-center gap-4">
        <Initials name={DEMO_USER.name} color="#FF9500" size={64} />
        <div><div className="text-xl font-bold">{DEMO_USER.name}</div><div className="text-[13px] text-muted">ama.owusu@st.ug.edu.gh · Student email verified</div></div>
      </div>
      <Group title="Studies">
        <Row label="University">University of Ghana</Row>
        <Row label="Level"><Segmented options={LEVELS} value={level} onChange={setLevel} labels={LEVEL_SHORT} /></Row>
      </Group>
      <Group title="Subscription">
        <Row label="Current plan">{PLAN_NAMES[plan]}</Row>
        <Row label={CREDIT_NAME}>{credits} available{allowance > 0 ? ` · ${allowance} monthly` : ""}{extra > 0 ? ` · ${extra} extra` : ""}</Row>
        <Link href="/plans#credits" className="block border-t border-edge/[0.06] px-4 py-3 text-sm" style={{ textDecoration: "none" }}>Buy more credits</Link>
        <Row label="Payment method">MTN MoMo · •• •• 0123</Row>
        <Link href="/plans" className="block border-t border-edge/[0.06] px-4 py-3 text-sm" style={{ textDecoration: "none" }}>Change plan</Link>
      </Group>
      <Group title="Appearance">
        <Row label="Theme"><Segmented options={["system", "light", "dark"] as readonly Theme[]} value={theme} onChange={setTheme} labels={{ system: "System", light: "Light", dark: "Dark" }} /></Row>
      </Group>
      <Group title="Demo">
        <Row label="Preview as plan"><Segmented options={["Free", "Pro", "Pro Max"] as readonly Plan[]} value={plan} onChange={setPlan} /></Row>
      </Group>
      <Link href="/welcome" className="rounded-xl bg-surface py-3 text-center text-sm font-medium text-red shadow-card" style={{ textDecoration: "none", color: "#FF3B30" }}>Sign Out</Link>
    </Page>
  );
}
