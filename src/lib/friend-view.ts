// Friend shapes and labels shared by the server (lib/friends) and the client (Friend activity, Leaderboard).

/**
 * Someone the user is friends with or has a request open with. Activity is shared only between friends, so
 * `lastSeen` is null and `streak` 0 on requests.
 */
export type Friend = { id: string; name: string; school: string | null; lastSeen: number | null; streak: number; best: number; today: boolean };
export type FriendLists = { friends: Friend[]; incoming: Friend[]; outgoing: Friend[] };
export const NO_FRIENDS: FriendLists = { friends: [], incoming: [], outgoing: [] };

/** Seen this recently counts as online. The shell's heartbeat runs every two minutes while the app is open. */
export const ONLINE_MS = 3 * 60_000;
export const HEARTBEAT_MS = 2 * 60_000;

export const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** A stored streak as it stands today: it lapses once a whole day passes without the app being opened. */
export function liveStreak(streak: number, streakDay: string, now = Date.now()) {
  return streakDay === dayOf(now) || streakDay === dayOf(now - 86_400_000) ? streak : 0;
}

/** "Online now", "Active 5 min ago", "Active yesterday", ... */
export function seenLabel(lastSeen: number | null, now = Date.now()) {
  if (lastSeen === null) return "Not active yet";
  const ago = now - lastSeen;
  if (ago < ONLINE_MS) return "Online now";
  if (ago < 3_600_000) return `Active ${Math.max(1, Math.round(ago / 60_000))} min ago`;
  if (ago < 86_400_000) return `Active ${Math.round(ago / 3_600_000)} h ago`;
  const days = Math.round(ago / 86_400_000);
  if (days === 1) return "Active yesterday";
  if (days < 30) return `Active ${days} days ago`;
  return `Active ${new Date(lastSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/** A steady avatar hue for an account. */
export function hueOf(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h % 360;
}
