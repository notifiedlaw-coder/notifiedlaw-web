"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";

export type AppUser = { name: string; first: string; email: string; image: string | null; initials: string };

const UserContext = createContext<AppUser | null>(null);

/** Shape a Better Auth user for the UI. */
export function toAppUser(u: { name: string; email: string; image?: string | null }): AppUser {
  const parts = u.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? u.email.split("@")[0];
  const initials = ((parts[0]?.[0] ?? first[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return { name: u.name || first, first, email: u.email, image: u.image ?? null, initials };
}

const PENDING: AppUser = { name: "", first: "", email: "", image: null, initials: "" };
const GUEST: AppUser = { name: "Guest", first: "Guest", email: "", image: null, initials: "?" };

const noop = () => () => {};

/** Reads the session in the browser so the shell can wrap public (statically rendered) pages too. */
export function SessionUser({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const user = isPending ? PENDING : data ? toAppUser(data.user) : GUEST;
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/**
 * The server always renders the pending user, but the client may already hold a cached session. Each
 * caller gets the pending user until its own subtree has hydrated, which matters under Suspense: a
 * boundary can hydrate after SessionUser already has the session.
 */
export function useUser(): AppUser {
  const u = useContext(UserContext);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  if (!u) throw new Error("useUser must be used inside SessionUser");
  return hydrated ? u : PENDING;
}
