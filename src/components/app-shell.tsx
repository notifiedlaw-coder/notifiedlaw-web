"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CREDIT_NAME, DEMO_USER, PLAN_NAMES } from "@/lib/data";
import { PlanProvider, usePlan } from "./plan";
import { ThemeToggle } from "./theme";
import {
  NAV_RESEARCH,
  NAV_STUDY,
  NAV_TOP,
  titleFor,
  type NavItem,
} from "@/lib/nav";
import { Icon } from "./icons";

const active = (path: string, href: string) =>
  path === href || path.startsWith(href + "/");

function SidebarLink({ item, path, onNavigate }: { item: NavItem; path: string; onNavigate?: () => void }) {
  const { pro } = usePlan();
  const on = active(path, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex h-[30px] items-center gap-[9px] rounded-md px-2 text-[13px] ${
        on ? "bg-blue text-white" : "text-ink hover:bg-edge/5"
      }`}
      style={{ textDecoration: "none", color: on ? "#fff" : undefined }}
    >
      <Icon name={item.icon} />
      <span className="flex-1">{item.label}</span>
      {item.badge && <span className="text-xs opacity-65">{item.badge}</span>}
      {item.proLock && !pro && (
        <Icon name="lock" size={11} className="opacity-55" />
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-2 pb-1 pt-4 text-[11px] font-semibold text-faint">
      {children}
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-baseline gap-px tracking-tight ${className}`}>
      <span className="font-bold">Notified</span>
      <span className="font-normal text-amber">Law</span>
    </span>
  );
}

function SidebarBody({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  const { plan } = usePlan();
  return (
    <>
      <div className="px-5 pb-3 pt-5 text-[17px]">
        <Wordmark />
      </div>
      <div className="px-3 pb-2.5">
        <Link
          href="/search"
          onClick={onNavigate}
          className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-edge/[0.055] px-[9px] text-[13px] text-muted"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Icon name="search" size={13} />
          Search cases, articles, topics
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-auto px-2.5">
        <div className="h-1.5" />
        {NAV_TOP.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} onNavigate={onNavigate} />
        ))}
        <SectionLabel>Study</SectionLabel>
        {NAV_STUDY.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} onNavigate={onNavigate} />
        ))}
        <SectionLabel>Research</SectionLabel>
        {NAV_RESEARCH.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} onNavigate={onNavigate} />
        ))}
      </nav>
      <Link
        href="/settings"
        title="Settings"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-t border-edge/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hover:bg-edge/[0.04]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-semibold text-white">
          AO
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-semibold">{DEMO_USER.name}</span>
          <span className="block truncate text-[11px] text-muted">
            {DEMO_USER.uniShort} · {PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1")}
          </span>
        </span>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="rgba(60,60,67,0.55)" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4" />
        </svg>
      </Link>
    </>
  );
}

function Sidebar({ path }: { path: string }) {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-edge/10 bg-sidebar md:flex">
      <SidebarBody path={path} />
    </aside>
  );
}

/** Phone navigation: the same sidebar, slid in over the page from a hamburger button. */
function Drawer({ path, onClose }: { path: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 cursor-default border-0 bg-black/40" />
      <div
        className="relative flex h-full w-[min(300px,85vw)] flex-col bg-sidebar shadow-2xl"
        style={{ animation: "nl-drawer-in 0.2s ease-out" }}
      >
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-edge/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <SidebarBody path={path} onNavigate={onClose} />
      </div>
    </div>
  );
}

function Toolbar({ path, onMenu }: { path: string; onMenu: () => void }) {
  const { plan, credits } = usePlan();
  const { title, sub } = titleFor(path);
  const deep = path.split("/").filter(Boolean).length > 1;
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-edge/10 bg-surface/90 px-4 backdrop-blur md:px-5">
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className="-ml-1.5 flex size-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-ink hover:bg-edge/5 md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {deep && (
        <Link
          href={"/" + path.split("/")[1]}
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-edge/5"
          aria-label="Back"
        >
          <Icon name="back" size={14} />
        </Link>
      )}
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[15px] font-semibold">{title}</span>
        {sub && <span className="truncate text-[11px] text-muted">{sub}</span>}
      </div>
      <div className="flex-1" />
      <div className="hidden sm:block"><ThemeToggle /></div>
      <Link
        href="/plans#credits"
        title={`${CREDIT_NAME}: buy more`}
        className="hidden h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-fill px-2.5 text-xs font-semibold tabular-nums sm:flex"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Icon name="sparkle" size={11} />
        {credits} credits
      </Link>
      <Link
        href="/plans"
        title="Plans"
        className="flex h-6 shrink-0 items-center whitespace-nowrap rounded-xl bg-fill px-2.5 text-xs font-semibold"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span className="sm:hidden">{PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1")}</span>
        <span className="hidden sm:inline">{PLAN_NAMES[plan]}</span>
      </Link>
      {plan !== "Pro Max" && (
        <Link
          href="/plans"
          className="hidden h-7 items-center rounded-[7px] bg-blue px-3.5 text-[13px] font-medium sm:flex"
          style={{ textDecoration: "none", color: "#fff" }}
        >
          Upgrade
        </Link>
      )}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  return (
    <PlanProvider>
    <div className="flex h-dvh overflow-hidden bg-surface text-[13px]">
      <Sidebar path={path} />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar path={path} onMenu={() => setMenu(true)} />
        <div className="min-h-0 flex-1 overflow-auto bg-canvas">
          {children}
        </div>
      </main>
      {menu && <Drawer path={path} onClose={() => setMenu(false)} />}
    </div>
    </PlanProvider>
  );
}
