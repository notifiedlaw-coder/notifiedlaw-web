"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { HEARTBEAT_MS, type FriendLists } from "@/lib/friend-view";

type Streak = { streak: number; best: number };
type Ctx = {
  /** Friend requests waiting on the user. */
  incoming: number;
  /** Messages waiting to be read. */
  unread: number;
  /** The user's own streak, once the first heartbeat is back. */
  mine: Streak | null;
  /** Sends a heartbeat now, to update the counts after something changed them. */
  refresh: () => void;
};
const FriendsCtx = createContext<Ctx>({ incoming: 0, unread: 0, mine: null, refresh: () => {} });
export const useFriends = () => useContext(FriendsCtx);

/** Sends a friends API call; the updated lists, or the error message to show. */
export async function friendsCall(method: string, url: string, body?: unknown): Promise<FriendLists | string> {
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json().catch(() => ({}))) as FriendLists & { error?: string };
    return res.ok ? data : data.error ?? "Something went wrong. Try again.";
  } catch {
    return "You seem to be offline. Try again.";
  }
}

/**
 * For signed-in users: sends the activity heartbeat (last seen, daily streak) while the app is open and visible, and
 * keeps the request and unread message counts for the friends button.
 */
export function FriendsProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [incoming, setIncoming] = useState(0);
  const [unread, setUnread] = useState(0);
  const [mine, setMine] = useState<Streak | null>(null);

  const beat = useCallback(() => {
    if (!enabled || document.visibilityState !== "visible") return;
    fetch("/api/activity", { method: "POST" })
      .then((r) => (r.ok ? (r.json() as Promise<{ incoming: number; unread: number } & Streak>) : null))
      .then((d) => {
        if (!d) return;
        setIncoming(d.incoming);
        setUnread(d.unread);
        setMine({ streak: d.streak, best: d.best });
      })
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", beat); };
  }, [enabled, beat]);

  const value = useMemo(() => ({ incoming, unread, mine, refresh: beat }), [incoming, unread, mine, beat]);
  return <FriendsCtx.Provider value={value}>{children}</FriendsCtx.Provider>;
}
