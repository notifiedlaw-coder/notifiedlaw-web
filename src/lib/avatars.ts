import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Uploads larger than this are refused before any work is done. */
export const MAX_AVATAR_UPLOAD = 8 * 1024 * 1024;
/** Stored pictures are this many pixels square. */
const SIZE = 256;
/** Bigger than any phone camera; refuses decompression bombs before they are decoded. */
const MAX_PIXELS = 50_000_000;

/** JPEG, PNG, WebP, GIF or HEIC/HEIF by their first bytes, whatever the file is called. */
function looksLikeImage(b: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return true;
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return true;
  if (ascii(0, 4) === "GIF8") return true;
  return ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|mif1|msf1|avif)$/.test(ascii(8, 12));
}

const stream = (bytes: Uint8Array<ArrayBuffer>) => new Response(bytes).body!;

/**
 * Turns an uploaded picture into a 256 px square WebP: decoded and re-encoded by the Images binding, so camera
 * metadata (location included) is dropped and nothing but pixels survives. Returns the WebP bytes or an error message.
 */
export async function toAvatar(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array | string> {
  if (!looksLikeImage(bytes)) return "Choose a JPEG, PNG, WebP or HEIC photo.";
  const images = getCloudflareContext().env.IMAGES;
  if (!images) return "Pictures cannot be uploaded right now.";
  try {
    const info = await images.info(stream(bytes));
    if (!("width" in info) || info.width * info.height > MAX_PIXELS) return "That photo is too large. Choose a smaller one.";
    const out = await images.input(stream(bytes))
      .transform({ width: SIZE, height: SIZE, fit: "cover", gravity: "auto" })
      .output({ format: "image/webp", quality: 80, anim: false });
    const webp = new Uint8Array(await new Response(out.image()).arrayBuffer());
    // A WebP header, as a last check that the binding gave back what was asked for.
    if (String.fromCharCode(...webp.subarray(8, 12)) !== "WEBP") return "That photo could not be read. Try another.";
    return webp;
  } catch {
    return "That photo could not be read. Try another.";
  }
}

/** Stores a picture under a fresh key, so caches never serve an old one. The caller prunes the old ones once it is saved. */
export async function storeAvatar(prefix: string, webp: Uint8Array) {
  const bucket = getCloudflareContext().env.FILES;
  const key = `avatars/${prefix}/${crypto.randomUUID()}.webp`;
  await bucket.put(key, webp, { httpMetadata: { contentType: "image/webp" } });
  return key;
}

/**
 * Deletes every picture stored under `prefix` except `keep`: the one just replaced, and any left over from an
 * earlier upload whose delete failed or raced. Call it once the new key is saved, so a failure never loses both.
 */
export async function pruneAvatars(prefix: string, keep: string) {
  const bucket = getCloudflareContext().env.FILES;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: `avatars/${prefix}/`, cursor }).catch(() => null);
    if (!page) return;
    const stale = page.objects.map((o) => o.key).filter((k) => k !== keep);
    if (stale.length) await bucket.delete(stale).catch(() => {});
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

export async function deleteAvatar(key: string | null) {
  if (key) await getCloudflareContext().env.FILES.delete(key).catch(() => {});
}
