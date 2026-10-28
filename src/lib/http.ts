const MAX_BODY = 8 * 1024;

/**
 * Parses a small JSON request body; null if it is missing, too large, or not JSON.
 */
export async function readJson(req: Request): Promise<unknown> {
  const bytes = await readBytes(req, MAX_BODY);
  if (!bytes?.length) return null;
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}

/**
 * The request body as bytes; null if it is missing or larger than `max`. The body is read as a stream and
 * abandoned past `max` bytes, so a request without a content-length cannot make the Worker buffer it all.
 */
export async function readBytes(req: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max || !req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { void reader.cancel().catch(() => {}); return null; }
      chunks.push(value);
    }
  } catch { return null; }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.byteLength; }
  return bytes;
}
