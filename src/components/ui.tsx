"use client";

import Link from "next/link";
import { BADGES, type Treatment } from "@/lib/content";
import { Icon } from "./icons";

export const cardCls = "rounded-2xl bg-surface shadow-card";

export function Page({ children, max = 960 }: { children: React.ReactNode; max?: number }) {
  return (
    <div className="mx-auto flex flex-col gap-6 px-5 pb-12 pt-6 md:px-10 md:pt-8" style={{ maxWidth: max }}>
      {children}
    </div>
  );
}

export function Title({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Eyebrow({ children, color = "rgba(60,60,67,0.55)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.05em]" style={{ color }}>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, labels,
}: { options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex rounded-lg bg-[rgba(118,118,128,0.12)] p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`h-7 flex-1 whitespace-nowrap rounded-md px-3 text-[13px] font-medium ${
            o === value ? "bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-ink/80"
          }`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-[26px] rounded-full px-3 text-xs font-medium ${on ? "bg-strong text-strong-fg" : "bg-surface text-ink shadow-[0_0_0_0.5px_var(--hairline)]"}`}
    >
      {children}
    </button>
  );
}

export function Badge({ kind, label }: { kind: Treatment; label?: string }) {
  const b = BADGES[kind];
  return (
    <span className="whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: b.bg, color: b.fg }}>
      {label ?? b.label}
    </span>
  );
}

export function Btn({
  children, onClick, href, tone = "primary", disabled, className = "",
}: { children: React.ReactNode; onClick?: () => void; href?: string; tone?: "primary" | "plain" | "dark"; disabled?: boolean; className?: string }) {
  const tones = {
    primary: "bg-blue text-white hover:bg-[#0068DA]",
    plain: "bg-surface text-ink shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill",
    dark: "bg-strong text-strong-fg",
  };
  const cls = `inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] px-3.5 text-[13px] font-medium disabled:opacity-50 ${tones[tone]} ${className}`;
  if (href)
    return (
      <Link href={href} className={cls} style={{ textDecoration: "none", color: tone === "plain" ? "var(--ink)" : "#fff" }}>
        {children}
      </Link>
    );
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/** Dimmed overlay with an upgrade prompt, used for plan-gated panels. */
export function Gate({
  title, body, cta, color = "#007AFF", href = "/plans",
}: { title: string; body: string; cta: string; color?: string; href?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 p-6 backdrop-blur-sm">
      <div className="flex max-w-[280px] flex-col items-center gap-2.5 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl text-white" style={{ background: color }}>
          <Icon name="lock" size={20} />
        </div>
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="text-[13px] leading-snug text-muted">{body}</div>
        <Btn href={href}>{cta}</Btn>
      </div>
    </div>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-9 flex-1 items-center gap-2 rounded-[10px] bg-surface px-3 shadow-[0_0_0_0.5px_var(--hairline)]">
      <Icon name="search" size={14} className="text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function Initials({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
    </span>
  );
}

export const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="rgba(60,60,67,0.3)" strokeWidth="2.2" strokeLinecap="round">
    <path d="m6 3 5 5-5 5" />
  </svg>
);
