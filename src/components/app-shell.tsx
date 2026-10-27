"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_USER, PLAN_NAMES } from "@/lib/data";
import {
  NAV_RESEARCH,
  NAV_STUDY,
  NAV_TABS,
  NAV_TOP,
  titleFor,
  type NavItem,
} from "@/lib/nav";
import { Icon } from "./icons";

const active = (path: string, href: string) =>
  path === href || path.startsWith(href + "/");

function SidebarLink({ item, path }: { item: NavItem; path: string }) {
  const on = active(path, item.href);
  return (
    <Link
      href={item.href}
      className={`flex h-[30px] items-center gap-[9px] rounded-md px-2 text-[13px] ${
        on ? "bg-blue text-white" : "text-ink hover:bg-black/5"
      }`}
      style={{ textDecoration: "none", color: on ? "#fff" : undefined }}
    >
      <Icon name={item.icon} />
      <span className="flex-1">{item.label}</span>
      {item.badge && <span className="text-xs opacity-65">{item.badge}</span>}
      {item.proLock && DEMO_USER.plan === "Free" && (
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

function Sidebar({ path }: { path: string }) {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-black/10 bg-sidebar lg:flex">
      <div className="px-5 pb-3 pt-5 text-[17px]">
        <Wordmark />
      </div>
      <div className="px-3 pb-2.5">
        <Link
          href="/search"
          className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-black/[0.055] px-[9px] text-[13px] text-muted"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Icon name="search" size={13} />
          Search cases, articles, topics
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-auto px-2.5">
        <div className="h-1.5" />
        {NAV_TOP.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} />
        ))}
        <SectionLabel>Study</SectionLabel>
        {NAV_STUDY.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} />
        ))}
        <SectionLabel>Research</SectionLabel>
        {NAV_RESEARCH.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} />
        ))}
      </nav>
      <Link
        href="/settings"
        title="Settings"
        className="flex items-center gap-2.5 border-t border-black/10 p-3 hover:bg-black/[0.04]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-track text-xs font-semibold text-muted">
          AO
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold">{DEMO_USER.name}</span>
          <span className="block text-[11px] text-muted">
            {DEMO_USER.uniShort} · {PLAN_NAMES[DEMO_USER.plan]}
          </span>
        </span>
      </Link>
    </aside>
  );
}

function Toolbar({ path }: { path: string }) {
  const { title, sub } = titleFor(path);
  const deep = path.split("/").filter(Boolean).length > 1;
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-black/10 bg-white/90 px-4 backdrop-blur lg:px-5">
      {deep && (
        <Link
          href={"/" + path.split("/")[1]}
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-black/5"
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
      <Link
        href="/plans"
        title="Plans"
        className="flex h-6 items-center rounded-xl bg-fill px-2.5 text-xs font-semibold"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {PLAN_NAMES[DEMO_USER.plan]}
      </Link>
      {DEMO_USER.plan !== "Pro Max" && (
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

function TabBar({ path }: { path: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-black/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {NAV_TABS.map((t) => {
        const on = active(path, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              on ? "text-blue" : "text-faint"
            }`}
            style={{ textDecoration: "none", color: on ? "#007aff" : undefined }}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex h-dvh overflow-hidden bg-white text-[13px] lg:text-[13px]">
      <Sidebar path={path} />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar path={path} />
        <div className="min-h-0 flex-1 overflow-auto bg-canvas pb-16 lg:pb-0">
          {children}
        </div>
      </main>
      <TabBar path={path} />
    </div>
  );
}
