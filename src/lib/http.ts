const MAX_BODY = 8 * 1024;

/** Parses a small JSON request body; null if it is missing, too large, or not JSON. */
export async function readJson(req: Request): Promise<unknown> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return null;
  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}
