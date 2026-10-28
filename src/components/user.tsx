"use client";

import { createContext, useContext } from "react";

export type AppUser = { name: string; first: string; email: string; image: string | null; initials: string };

const UserContext = createContext<AppUser | null>(null);

export const UserProvider = UserContext.Provider;

/** Shape a Better Auth user for the UI. */
export function toAppUser(u: { name: string; email: string; image?: string | null }): AppUser {
  const parts = u.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? u.email.split("@")[0];
  const initials = ((parts[0]?.[0] ?? first[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return { name: u.name || first, first, email: u.email, image: u.image ?? null, initials };
}

export function useUser(): AppUser {
  const u = useContext(UserContext);
  if (!u) throw new Error("useUser must be used inside the signed-in app");
  return u;
}
