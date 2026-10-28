"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CREDIT_NAME, PLAN_NAMES } from "@/lib/data";
import { UNI_SHORT, type Me } from "@/lib/profile";
import { useUser } from "@/components/user";
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
      aria-current={on ? "page" : undefined}
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
        <><Icon name="lock" size={11} className="opacity-55" /><span className="sr-only">Locked</span></>
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

const pill = "flex h-8 items-center whitespace-nowrap rounded-full bg-edge/[0.055] hover:bg-edge/[0.09] px-3 text-[13px] font-medium min-[1920px]:h-9 min-[1920px]:px-4 min-[1920px]:text-sm min-[2560px]:h-10 min-[2560px]:text-[15px]";

/** Desktop only: the plan, credits, Upgrade and theme toggle that sit in the top bar on phones. */
function PlanBlock() {
  const { plan, credits } = usePlan();
  const shimmer = plan === "Pro Max" ? "nl-shimmer" : undefined;
  return (
    <div className="flex flex-col gap-2 border-t border-edge/10 p-3">
      <div className="flex items-center gap-2">
        <Link href="/plans" title="Plans" className={`${pill} min-w-0 flex-1`} style={{ textDecoration: "none", color: "inherit" }}>
          <span className="truncate"><span className={shimmer}>{PLAN_NAMES[plan]}</span></span>
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/plans#credits"
          title={`${CREDIT_NAME}: buy more`}
          className={`${pill} flex-1 tabular-nums`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span className="mr-1 inline-flex"><Icon name="sparkle" size={11} /></span>
          {credits} credits
        </Link>
        {plan !== "Pro Max" && (
          <Link
            href="/plans"
            className="flex h-8 items-center rounded-full bg-blue px-4 text-[13px] font-medium min-[1920px]:h-9 min-[1920px]:px-5 min-[1920px]:text-sm min-[2560px]:h-10 min-[2560px]:text-[15px]"
            style={{ textDecoration: "none", color: "#fff" }}
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
}

function SidebarBody({ path, onNavigate }: { path: string; onNavigate?: (href: string) => void }) {
  const { plan, profile } = usePlan();
  const user = useUser();
  const roomy = !!onNavigate; // the phone drawer: larger, bolder rows
  return (
    <>
      <div className={`px-5 pb-3 pt-5 ${roomy ? "text-xl" : "text-[19px] min-[1920px]:text-[22px]"}`}>
        <Wordmark />
      </div>
      <nav aria-label="Primary" data-drawer-scroll className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2.5">
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
      {!roomy && <PlanBlock />}
      <Link
        href="/settings"
        title="Settings"
        onClick={intercept("/settings", onNavigate)}
        className="flex items-center gap-2.5 border-t border-edge/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hover:bg-edge/[0.04]"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-semibold text-white">
          {user.initials}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14px] font-semibold min-[1920px]:text-[15px]">{user.name}</span>
          <span className="block truncate text-xs text-muted min-[1920px]:text-[13px]">
            {profile?.university ? (UNI_SHORT[profile.university] ?? profile.university) + " · " : ""}{PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1")}
          </span>
        </span>
      </Link>
    </>
  );
}

function Sidebar({ path }: { path: string }) {
  return (
    <aside aria-label="Sidebar" className="hidden w-[248px] shrink-0 flex-col min-[1440px]:w-[272px] min-[1920px]:w-[304px] min-[2560px]:w-[336px] border-r border-edge/10 bg-sidebar md:flex">
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

  // Scroll lock while the menu is open: the page behind must not scroll, rubber-band or pull-to-refresh.
  // Only the menu list scrolls, and at its ends the gesture is swallowed instead of chaining to the page.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overscrollBehavior;
    root.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    const el = panel.current?.parentElement;
    let y0 = 0;
    const start = (e: TouchEvent) => { y0 = e.touches[0].clientY; };
    const move = (e: TouchEvent) => {
      const list = (e.target as HTMLElement).closest<HTMLElement>("[data-drawer-scroll]");
      if (!list) { e.preventDefault(); return; }
      const dy = e.touches[0].clientY - y0; // > 0: finger moving down, content scrolls toward the top
      const atTop = list.scrollTop <= 0;
      const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault();
    };
    el?.addEventListener("touchstart", start, { passive: true });
    el?.addEventListener("touchmove", move, { passive: false });
    return () => {
      root.style.overscrollBehavior = prev;
      document.body.style.overflow = "";
      el?.removeEventListener("touchstart", start);
      el?.removeEventListener("touchmove", move);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => close()}
        className={`absolute inset-0 cursor-default touch-none border-0 bg-black/40 transition-opacity duration-[250ms] ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panel}
        className={`relative ml-auto flex h-full w-[min(300px,85vw)] overscroll-none flex-col bg-sidebar shadow-2xl transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none ${shown ? "translate-x-0" : "translate-x-full"}`}
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

/**
 * Phone top bar: a translucent 56 px bar with the page name on the left (after a back chevron inside a
 * section), the plan on the right and the menu button last. From md up it is hidden and its controls
 * live in the sidebar.
 */
function Toolbar({ path, onMenu }: { path: string; onMenu: () => void }) {
  const { plan } = usePlan();
  const { title } = titleFor(path);
  const parts = path.split("/").filter(Boolean);
  const deep = parts.length > 1;
  const short = PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1");
  const shimmer = plan === "Pro Max" ? "nl-shimmer" : undefined;
  return (
    <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b-[0.5px] border-edge/20 bg-surface/80 pl-4 pr-1 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
      {deep && (
        <Link
          href={"/" + parts.slice(0, -1).join("/")}
          className="-ml-3 flex size-11 shrink-0 items-center justify-center text-link active:opacity-50"
          aria-label="Back"
        >
          <Icon name="back" size={20} />
        </Link>
      )}
      <span className={`min-w-0 truncate text-[20px] font-bold leading-tight tracking-[-0.02em] ${deep ? "-ml-1.5" : ""}`}>{title}</span>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block"><ThemeToggle /></div>
        <Link href="/plans" title="Plans" className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-fill px-3.5 text-[13px] font-semibold" style={{ textDecoration: "none", color: "inherit" }}>
          <span className={shimmer}>{short}</span>
        </Link>
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="flex size-11 shrink-0 items-center justify-center border-0 bg-transparent text-ink active:opacity-50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
    </header>
  );
}

export function AppShell({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  return (
    <PlanProvider me={me}>
    <div className="flex h-dvh overflow-hidden bg-surface text-[13px]">
      <Sidebar path={path} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar path={path} onMenu={() => setMenu(true)} />
        <main id="main" tabIndex={-1} className="nl-content min-h-0 flex-1 overflow-auto bg-canvas">
          {children}
        </main>
      </div>
      {menu && <Drawer path={path} onClose={closeMenu} />}
    </div>
    </PlanProvider>
  );
}
