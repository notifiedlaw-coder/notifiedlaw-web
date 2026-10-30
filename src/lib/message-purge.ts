const BATCH = 1000;

/**
 * Deletes messages past their delete date (30 days after reading, or 90 days after sending if never read), in batches so one run never holds D1 for long.
 * Run by the Worker's daily cron (custom-worker.ts); reads already skip expired messages, so this only frees space.
 */
export async function purgeExpiredMessages(db: D1Database, now = Date.now()) {
  let deleted = 0;
  for (;;) {
    const r = await db.prepare("DELETE FROM message WHERE id IN (SELECT id FROM message WHERE expires_at <= ?1 LIMIT ?2)").bind(now, BATCH).run();
    deleted += r.meta.changes;
    if (r.meta.changes < BATCH) return deleted;
  }
}
