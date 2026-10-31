// The Worker's cron jobs for calls and messages (custom-worker.ts). Free of Next.js imports: raw D1 and fetch.
import { closeTracks, type SfuEnv } from "./sfu";

const BATCH = 1000;
/** A call nobody has polled for this long is over (the call screen polls every few seconds). */
const IDLE_MS = 2 * 60_000;
/** Call records are kept this long, as the privacy policy says. */
const CALL_RECORDS_MS = 30 * 86_400_000;

type Track = { mid: string };

/**
 * Ends calls past their 3 hours, or that everyone has left without saying so (closed tab, lost signal), and stops
 * their tracks at the SFU so a modified browser cannot keep a call going. Runs every five minutes.
 */
export async function sweepCalls(db: D1Database, env: SfuEnv, now = Date.now()) {
  const { results } = await db.prepare(
    `SELECT c.id FROM call c WHERE c.ended_at IS NULL AND (c.ends_at <= ?1 OR (c.started_at < ?2 AND NOT EXISTS
       (SELECT 1 FROM call_participant p WHERE p.call_id = c.id AND p.left_at IS NULL AND p.seen_at > ?2))) LIMIT 200`,
  ).bind(now, now - IDLE_MS).all<{ id: string }>();
  for (const { id } of results) {
    const { results: people } = await db.prepare("SELECT session_id, tracks, pulled FROM call_participant WHERE call_id = ?1 AND left_at IS NULL").bind(id).all<{ session_id: string; tracks: string; pulled: string }>();
    await Promise.all(people.map((p) => closeTracks(env, p.session_id, [...(JSON.parse(p.tracks) as Track[]), ...(JSON.parse(p.pulled) as Track[])].map((t) => t.mid))));
    await db.batch([
      db.prepare("UPDATE call SET ended_at = ?2, end_reason = CASE WHEN ends_at <= ?2 THEN 'time' ELSE 'ended' END WHERE id = ?1 AND ended_at IS NULL").bind(id, now),
      db.prepare("UPDATE call_participant SET left_at = ?2 WHERE call_id = ?1 AND left_at IS NULL").bind(id, now),
    ]);
  }
  return results.length;
}

/** Deletes expired direct and group messages, and call records older than 30 days, in batches. Runs daily. */
export async function purgeExpired(db: D1Database, now = Date.now()) {
  const counts: Record<string, number> = {};
  const jobs: [string, string, number][] = [
    ["message", "expires_at <= ?1", now],
    ["group_message", "expires_at <= ?1", now],
    ["call", "started_at <= ?1", now - CALL_RECORDS_MS],
    ["typing", "until_at <= ?1", now],
  ];
  for (const [table, where, at] of jobs) {
    counts[table] = 0;
    for (;;) {
      const r = await db.prepare(`DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} WHERE ${where} LIMIT ${BATCH})`).bind(at).run();
      counts[table] += r.meta.changes;
      if (r.meta.changes < BATCH) break;
    }
  }
  return counts;
}
