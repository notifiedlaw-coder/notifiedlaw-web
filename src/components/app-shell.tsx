"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

/** In the phone drawer a plain click is handed to the drawer, which closes first and navigates after. */
const intercept = (href: string, onNavigate?: (href: string) => void) =>
  onNavigate
    ? (e: React.MouseEvent) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(href);
      }
    : undefined;

function SidebarLink({ item, path, onNavigate, roomy }: { item: NavItem; path: string; onNavigate?: (href: string) => void; roomy?: boolean }) {
  const { pro } = usePlan();
  const on = active(path, item.href);
  return (
    <Link
      href={item.href}
      onClick={intercept(item.href, onNavigate)}
      className={`flex items-center rounded-md ${
        roomy ? "h-[42px] gap-3 rounded-[10px] px-3 text-[16px] font-semibold" : "h-8 gap-2.5 rounded-lg px-2.5 text-[14px] min-[1440px]:h-9 min-[1440px]:text-[15px] min-[1920px]:h-10 min-[1920px]:gap-3 min-[1920px]:text-[16px] min-[2560px]:h-11 min-[2560px]:text-[17px]"
      } ${on ? "bg-blue text-white" : "text-ink hover:bg-edge/5"}`}
      style={{ textDecoration: "none", color: on ? "#fff" : undefined }}
    >
      <Icon name={item.icon} size={roomy ? 19 : undefined} className={roomy ? undefined : "min-[1440px]:scale-110 min-[1920px]:scale-125"} />
      <span className="flex-1" style={{ color: on ? "#fff" : "var(--ink)" }}>{item.label}</span>
      {item.badge && <span className="text-xs opacity-65">{item.badge}</span>}
      {item.proLock && !pro && (
        <Icon name="lock" size={11} className="opacity-55" />
      )}
    </Link>
  );
}

function SectionLabel({ children, roomy }: { children: string; roomy?: boolean }) {
  return (
    <div className={`font-semibold text-faint ${roomy ? "px-3 pb-1 pt-4 text-xs uppercase tracking-[0.04em]" : "px-2.5 pb-1 pt-4 text-xs min-[1440px]:text-[13px] min-[1920px]:pt-5 min-[1920px]:text-sm"}`}>
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

function SidebarBody({ path, onNavigate }: { path: string; onNavigate?: (href: string) => void }) {
  const { plan } = usePlan();
  const roomy = !!onNavigate; // the phone drawer: larger, bolder rows
  return (
    <>
      <div className={`px-5 pb-3 pt-5 ${roomy ? "text-xl" : "text-[19px] min-[1920px]:text-[22px]"}`}>
        <Wordmark />
      </div>
      <div className="px-3 pb-2.5">
        <Link
          href="/search"
          onClick={intercept("/search", onNavigate)}
          className={`flex items-center gap-1.5 bg-edge/[0.055] text-muted ${roomy ? "h-10 rounded-[10px] px-3 text-[15px]" : "h-8 rounded-lg px-2.5 text-[14px] min-[1440px]:h-9 min-[1440px]:text-[15px] min-[1920px]:h-10 min-[1920px]:text-[16px]"}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Icon name="search" size={roomy ? 16 : 13} />
          Search cases, articles, topics
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-auto px-2.5">
        <div className="h-1.5" />
        {NAV_TOP.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} onNavigate={onNavigate} roomy={roomy} />
        ))}
        <SectionLabel roomy={roomy}>Study</SectionLabel>
        {NAV_STUDY.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} onNavigate={onNavigate} roomy={roomy} />
        ))}
        <SectionLabel roomy={roomy}>Research</SectionLabel>
        {NAV_RESEARCH.map((i) => (
          <SidebarLink key={i.href} item={i} path={path} onNavigate={onNavigate} roomy={roomy} />
        ))}
      </nav>
      <Link
        href="/settings"
        title="Settings"
        onClick={intercept("/settings", onNavigate)}
        className="flex items-center gap-2.5 border-t border-edge/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hover:bg-edge/[0.04]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-semibold text-white">
          AO
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14px] font-semibold min-[1920px]:text-[15px]">{DEMO_USER.name}</span>
          <span className="block truncate text-xs text-muted min-[1920px]:text-[13px]">
            {DEMO_USER.uniShort} · {PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1")}
          </span>
        </span>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 text-faint" aria-hidden>
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4" />
        </svg>
      </Link>
    </>
  );
}

function Sidebar({ path }: { path: string }) {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col min-[1440px]:w-[272px] min-[1920px]:w-[304px] min-[2560px]:w-[336px] border-r border-edge/10 bg-sidebar md:flex">
      <SidebarBody path={path} />
    </aside>
  );
}

const DRAWER_MS = 250;

/**
 * Phone navigation: the same sidebar, slid in from the right by the hamburger button.
 * Tapping a link slides the drawer away first and navigates once it is gone, so the new
 * page's rendering never competes with the animation.
 */
function Drawer({ path, onClose }: { path: string; onClose: () => void }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A second tap while the drawer is already sliding away is ignored, so it never navigates twice.
  const close = useCallback((href?: string) => {
    if (closing.current) return;
    setShown(false);
    closing.current = setTimeout(() => {
      onClose();
      if (href) router.push(href);
    }, DRAWER_MS);
  }, [onClose, router]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus({ preventScroll: true });
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [close]);
  useEffect(() => () => clearTimeout(closing.current), []);

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        aria-label="Close menu"
        onClick={() => close()}
        className={`absolute inset-0 cursor-default border-0 bg-black/40 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative ml-auto flex h-full w-[min(300px,85vw)] flex-col bg-sidebar shadow-2xl transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          ref={closeBtn}
          onClick={() => close()}
          aria-label="Close menu"
          className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-edge/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <SidebarBody path={path} onNavigate={close} />
      </div>
    </div>
  );
}

function Toolbar({ path, onMenu }: { path: string; onMenu: () => void }) {
  const { plan, credits } = usePlan();
  const { title, sub } = titleFor(path);
  const parts = path.split("/").filter(Boolean);
  const deep = parts.length > 1;
  const atHome = path === "/dashboard";
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-edge/10 bg-surface/90 px-4 backdrop-blur md:px-5 min-[1440px]:h-14 min-[1440px]:gap-3.5 min-[1440px]:px-6 min-[1920px]:h-16 min-[1920px]:gap-4 min-[1920px]:px-8 min-[2560px]:h-[72px] min-[2560px]:px-10">
      {deep && (
        <Link
          href={"/" + parts.slice(0, -1).join("/")}
          className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-md text-blue hover:bg-edge/5 md:hidden"
          aria-label="Back"
        >
          <Icon name="back" size={18} />
        </Link>
      )}
      {!atHome && (
        <Link
          href="/dashboard"
          className={`${deep ? "" : "-ml-2 "}flex size-9 shrink-0 items-center justify-center rounded-md text-blue hover:bg-edge/5 md:hidden`}
          aria-label="Home"
        >
          <Icon name="home" size={18} />
        </Link>
      )}
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[15px] font-semibold min-[1440px]:text-[17px] min-[1920px]:text-[20px] min-[2560px]:text-[22px]">{title}</span>
        {sub && <span className="truncate text-[11px] text-muted min-[1440px]:text-xs min-[1920px]:text-[13px] min-[2560px]:text-sm">{sub}</span>}
      </div>
      <div className="flex-1" />
      <div className="hidden sm:block"><ThemeToggle /></div>
      <Link
        href="/plans#credits"
        title={`${CREDIT_NAME}: buy more`}
        className="hidden h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-fill px-2.5 text-xs font-semibold tabular-nums sm:flex min-[1440px]:h-7 min-[1440px]:text-[13px] min-[1920px]:h-8 min-[1920px]:px-3.5 min-[1920px]:text-sm min-[2560px]:h-9 min-[2560px]:text-[15px]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Icon name="sparkle" size={11} />
        {credits} credits
      </Link>
      <Link
        href="/plans"
        title="Plans"
        className="flex h-6 shrink-0 items-center whitespace-nowrap rounded-xl bg-fill px-2.5 text-xs font-semibold min-[1440px]:h-7 min-[1440px]:text-[13px] min-[1920px]:h-8 min-[1920px]:px-3.5 min-[1920px]:text-sm min-[2560px]:h-9 min-[2560px]:text-[15px]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span className="md:hidden"><span className={plan === "Pro Max" ? "nl-shimmer" : undefined}>{PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1")}</span></span>
        <span className="hidden md:inline"><span className={plan === "Pro Max" ? "nl-shimmer" : undefined}>{PLAN_NAMES[plan]}</span></span>
      </Link>
      {plan !== "Pro Max" && (
        <Link
          href="/plans"
          className="hidden h-7 items-center rounded-[7px] bg-blue px-3.5 text-[13px] font-medium sm:flex min-[1440px]:h-8 min-[1440px]:text-sm min-[1920px]:h-9 min-[1920px]:px-4 min-[1920px]:text-[15px] min-[2560px]:h-10 min-[2560px]:text-base"
          style={{ textDecoration: "none", color: "#fff" }}
        >
          Upgrade
        </Link>
      )}
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-ink hover:bg-edge/5 md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  return (
    <PlanProvider>
    <div className="flex h-dvh overflow-hidden bg-surface text-[13px]">
      <Sidebar path={path} />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar path={path} onMenu={() => setMenu(true)} />
        <div className="nl-content min-h-0 flex-1 overflow-auto bg-canvas">
          {children}
        </div>
      </main>
      {menu && <Drawer path={path} onClose={closeMenu} />}
    </div>
    </PlanProvider>
  );
}
