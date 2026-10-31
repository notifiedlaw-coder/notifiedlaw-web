"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLAN_NAMES } from "@/lib/data";
import type { Me } from "@/lib/profile";
import { useUser } from "@/components/user";
import { PlanProvider, usePlan } from "./plan";
import { NAV, isActive, sectionFor, titleFor, type NavSection } from "@/lib/nav";
import { Icon } from "./icons";
import { FriendsProvider, useFriends } from "./friends";
import { CallProvider } from "./calls";

const plain = { textDecoration: "none", color: "inherit" } as const;

/** The app mark: a navy tile with the serif N and the terracotta notification dot. */
export function LogoMark({ size = 32, ring = "var(--sidebar)" }: { size?: number; ring?: string }) {
  const dot = Math.round(size * 0.31);
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center bg-[#23305C] font-display leading-none text-[#F6F5F2]"
      style={{ width: size, height: size, borderRadius: size * 0.28, fontSize: size * 0.75, paddingTop: 2 }}
    >
      N
      <span className="absolute rounded-full bg-[#E0683A]" style={{ top: -3, right: -3, width: dot, height: dot, border: `2px solid ${ring}` }} />
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display leading-none ${className}`}>Notified<i>Law</i></span>;
}

/** Requests and unread messages, shown on the Community destination. */
function useCommunityCount() {
  const { incoming, unread } = useFriends();
  return incoming + unread;
}

function Count({ n, className = "" }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={`grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#E0683A] px-1 text-[11px] font-bold leading-none text-[#161A26] ${className}`}>
      {n > 9 ? "9+" : n}
      <span className="sr-only"> new</span>
    </span>
  );
}

function Avatar({ size }: { size: number }) {
  const { avatar } = usePlan();
  const user = useUser();
  return avatar
    // eslint-disable-next-line @next/next/no-img-element -- a 256 px WebP from our own route
    ? <img src={avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    : <span className="grid shrink-0 place-items-center rounded-full bg-plum font-bold text-[#F6F5F2]" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{user.initials}</span>;
}

/** Desktop (lg up): the five destinations, the open one expanded to its sub-pages, and the profile at the foot. */
function Sidebar({ path }: { path: string }) {
  const { plan, pro, credits } = usePlan();
  const user = useUser();
  const sec = sectionFor(path);
  const community = useCommunityCount();
  return (
    <aside aria-label="Sidebar" className="nl-chrome hidden w-[248px] shrink-0 flex-col gap-0.5 border-r border-edge/10 bg-sidebar px-3.5 pb-4 pt-5 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2.5 pb-5 pt-1 text-ink" style={plain}>
        <LogoMark />
        <Wordmark className="text-[24px]" />
      </Link>
      <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const on = n.id === sec?.id;
          return (
            <div key={n.id} className="flex flex-col">
              <Link
                href={n.href}
                aria-current={on && !n.items ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-[16px] ${on ? "bg-tint font-bold text-blue" : "font-medium text-muted hover:bg-edge/[0.05]"}`}
                style={{ textDecoration: "none" }}
              >
                <Icon name={n.icon} size={20} />
                <span className="flex-1">{n.label}</span>
                {n.id === "community" && <Count n={community} />}
              </Link>
              {on && n.items && (
                <div className="flex flex-col gap-0.5 pb-2.5 pl-11 pt-0.5">
                  {n.items.map((i) => {
                    const here = isActive(path, i.href);
                    return (
                      <Link
                        key={i.href}
                        href={i.href}
                        aria-current={here ? "page" : undefined}
                        className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-[15px] ${here ? "bg-surface font-bold text-blue" : "font-medium text-muted hover:bg-edge/[0.05]"}`}
                        style={{ textDecoration: "none" }}
                      >
                        <span className="flex-1">{i.label}</span>
                        {i.proLock && !pro && <><Icon name="lock" size={11} className="opacity-55" /><span className="sr-only">Locked</span></>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <Link
        href="/settings"
        aria-current={isActive(path, "/settings") ? "page" : undefined}
        className="mt-2 flex items-center gap-2.5 rounded-xl border border-edge/10 bg-surface p-2.5 text-ink hover:bg-hover"
        style={plain}
      >
        <Avatar size={36} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[15px] font-semibold">{user.name}</span>
          <span className="truncate text-[13px] text-faint">{PLAN_NAMES[plan].replace(/^.*\((.*)\)$/, "$1")}{plan !== "None" ? ` · ${credits} credits` : ""}</span>
        </span>
      </Link>
    </aside>
  );
}

/** Tablet (md to lg): an icon rail with the same five destinations; sub-pages sit as tabs under the top bar. */
function Rail({ path }: { path: string }) {
  const sec = sectionFor(path);
  const community = useCommunityCount();
  return (
    <aside aria-label="Sidebar" className="hidden w-[84px] shrink-0 flex-col items-center gap-1.5 border-r border-edge/10 bg-sidebar px-2 pb-4 pt-[18px] md:flex lg:hidden">
      <Link href="/dashboard" aria-label="Today" className="pb-4"><LogoMark size={36} /></Link>
      <nav aria-label="Primary" className="flex flex-col items-center gap-1.5">
        {NAV.map((n) => {
          const on = n.id === sec?.id;
          return (
            <Link
              key={n.id}
              href={n.href}
              aria-current={on && !n.items ? "page" : undefined}
              className={`relative flex min-h-[60px] w-[68px] flex-col items-center justify-center gap-1 rounded-xl text-[12px] ${on ? "bg-tint font-bold text-blue" : "font-medium text-muted hover:bg-edge/[0.05]"}`}
              style={{ textDecoration: "none" }}
            >
              <Icon name={n.icon} size={22} />
              {n.label}
              {n.id === "community" && <Count n={community} className="absolute right-2 top-1.5" />}
            </Link>
          );
        })}
      </nav>
      <Link href="/settings" aria-label="Settings" className="mt-auto rounded-full"><Avatar size={44} /></Link>
    </aside>
  );
}

/** Top bar on every screen: the page name (and its line on tablets and up); on phones the mark or a back button, and the profile. */
function Toolbar({ path }: { path: string }) {
  const { title, sub } = titleFor(path);
  const parts = path.split("/").filter(Boolean);
  const deep = parts.length > 1;
  return (
    <header className="nl-chrome flex h-[calc(3.75rem+env(safe-area-inset-top))] shrink-0 items-center gap-3.5 border-b border-edge/[0.08] bg-canvas pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] md:h-[72px] md:px-7 lg:px-10">
      {deep ? (
        <Link href={"/" + parts.slice(0, -1).join("/")} className="-ml-3 flex size-11 shrink-0 items-center justify-center text-link active:opacity-50 md:hidden" aria-label="Back">
          <Icon name="back" size={20} />
        </Link>
      ) : (
        <Link href="/dashboard" aria-label="Today" className="md:hidden"><LogoMark size={30} ring="var(--canvas)" /></Link>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-display text-[24px] leading-[1.1] md:text-[28px]">{title}</span>
        {sub && <span className="hidden truncate text-[14px] text-faint md:block">{sub}</span>}
      </div>
      <Link href="/settings" aria-label="Settings" className="ml-auto rounded-full md:hidden"><Avatar size={40} /></Link>
    </header>
  );
}

/** Below lg: the open destination's sub-pages as a row of tabs. */
function SubTabs({ path, sec }: { path: string; sec: NavSection }) {
  const { pro } = usePlan();
  return (
    <nav aria-label={sec.label} className="flex shrink-0 gap-1 overflow-x-auto border-b border-edge/[0.08] bg-canvas px-2.5 [scrollbar-width:none] md:px-6 lg:hidden [&::-webkit-scrollbar]:hidden">
      {sec.items!.map((i) => {
        const on = isActive(path, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3.5 text-[15px] ${on ? "border-blue font-bold text-blue" : "border-transparent font-medium text-muted"}`}
            style={{ textDecoration: "none" }}
          >
            {i.label}
            {i.proLock && !pro && <><Icon name="lock" size={11} className="opacity-55" /><span className="sr-only">Locked</span></>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phones: the five destinations as a tab bar; the open one sits in a tinted pill. */
function TabBar({ path }: { path: string }) {
  const sec = sectionFor(path);
  const community = useCommunityCount();
  return (
    <nav aria-label="Tabs" className="grid shrink-0 grid-cols-5 border-t border-edge/10 bg-canvas px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pt-1.5 md:hidden">
      {NAV.map((n) => {
        const on = n.id === sec?.id;
        return (
          <Link
            key={n.id}
            href={n.href}
            aria-current={on && !n.items ? "page" : undefined}
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-[3px] text-[11px] ${on ? "font-bold text-blue" : "font-medium text-faint"}`}
            style={{ textDecoration: "none" }}
          >
            <span className={`relative grid h-[30px] w-11 place-items-center rounded-full ${on ? "bg-tint" : ""}`}>
              <Icon name={n.icon} size={22} />
              {n.id === "community" && <Count n={community} className="absolute -right-1 -top-1" />}
            </span>
            <span className="max-w-full truncate">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ me, children }: { me: Me | null; children: React.ReactNode }) {
  const path = usePathname();
  const sec = sectionFor(path);
  return (
    <PlanProvider me={me}>
    <FriendsProvider enabled={!!me}>
    <CallProvider enabled={!!me}>
    <div className="flex h-dvh overflow-hidden bg-canvas text-[15px] text-ink">
      <Sidebar path={path} />
      <Rail path={path} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Toolbar path={path} />
        {sec?.items && <SubTabs path={path} sec={sec} />}
        <main id="main" tabIndex={-1} className="nl-content min-h-0 flex-1 overflow-auto overscroll-contain bg-canvas">
          {children}
        </main>
        <TabBar path={path} />
      </div>
    </div>
    </CallProvider>
    </FriendsProvider>
    </PlanProvider>
  );
}
