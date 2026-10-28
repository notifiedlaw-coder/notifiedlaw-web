"use client";

import Link from "next/link";
import { BADGES, type Treatment } from "@/lib/content";
import { LEVELS, LEVEL_LABEL, LEVEL_SHORT, type Level } from "@/lib/data";
import { Icon } from "./icons";

export const cardCls = "rounded-2xl bg-surface shadow-card";

export function Page({ children, max = 960 }: { children: React.ReactNode; max?: number }) {
  return (
    <div className="mx-auto flex flex-col gap-6 px-5 pb-12 pt-6 md:px-10 md:pt-8" style={{ maxWidth: max }}>
      {children}
    </div>
  );
}

/**
 * Intro line and actions for a page. The page name itself lives in the top bar, so the heading here is
 * visually hidden: it stays for screen readers and search engines, which need one h1 per page.
 */
export function Title({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <h1 className="sr-only">{title}</h1>
      {sub && <p className="m-0 min-w-0 flex-1 text-sm text-muted">{sub}</p>}
      {right}
    </div>
  );
}

export function Eyebrow({ children, color = "var(--faint)" }: { children: React.ReactNode; color?: string }) {
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
    <div className="flex max-w-full overflow-x-auto rounded-lg bg-[rgba(118,118,128,0.12)] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`h-8 flex-1 whitespace-nowrap rounded-md px-2.5 text-[13px] sm:h-7 sm:px-3 font-medium ${
            o === value ? "bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-ink/80"
          }`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

/** Level picker: a dropdown on phones (six options don't fit edge to edge), the segmented control from sm up. */
export function LevelSelect({ value, onChange }: { value: Level; onChange: (v: Level) => void }) {
  return (
    <>
      <label className="relative sm:hidden">
        <span className="sr-only">Level</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as Level)}
          className="h-10 appearance-none rounded-[10px] border-0 bg-surface py-0 pl-3.5 pr-9 text-[15px] font-medium text-ink shadow-[0_0_0_0.5px_var(--hairline)] outline-none focus-visible:ring-2 focus-visible:ring-blue"
        >
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
          <path d="m3 6 5 5 5-5" />
        </svg>
      </label>
      <div className="hidden sm:block">
        <Segmented options={LEVELS} value={value} onChange={onChange} labels={LEVEL_SHORT} />
      </div>
    </>
  );
}

export function Chip({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
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
  children, onClick, href, tone = "primary", disabled, className = "", type = "button",
}: { children: React.ReactNode; onClick?: () => void; href?: string; tone?: "primary" | "plain" | "dark"; disabled?: boolean; className?: string; type?: "button" | "submit" }) {
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
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
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
        aria-label={placeholder}
        maxLength={100}
        autoComplete="off"
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
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-faint opacity-60" aria-hidden>
    <path d="m6 3 5 5-5 5" />
  </svg>
);

/** Shown where a page has no published content yet. */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className={`${cardCls} flex flex-col items-center gap-1.5 px-6 py-12 text-center`}>
      <div className="text-[15px] font-semibold">{title}</div>
      {children && <div className="max-w-[420px] text-[13px] text-muted">{children}</div>}
    </div>
  );
}
