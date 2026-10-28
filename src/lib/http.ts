const MAX_BODY = 8 * 1024;

/**
 * Parses a small JSON request body; null if it is missing, too large, or not JSON. The body is read as a stream
 * and abandoned past MAX_BODY bytes, so a request without a content-length cannot make the Worker buffer it all.
 */
export async function readJson(req: Request): Promise<unknown> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY || !req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { void reader.cancel().catch(() => {}); return null; }
      chunks.push(value);
    }
  } catch { return null; }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.byteLength; }
  const text = new TextDecoder().decode(bytes);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
