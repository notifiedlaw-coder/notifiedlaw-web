import { userIdFrom } from "@/lib/auth";
import type { FileKind } from "@/lib/file-check";
import { limited } from "@/lib/rate-limit";
import { CONTENT_TYPES, dropRow, filesBucket, ownFile } from "@/lib/files";

/** Header value for the download name: an ASCII fallback plus the exact name, RFC 6266 style. */
function disposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Streams one of the user's own files. ?view=1 opens a PDF in the browser; everything else downloads. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userIdFrom(req);
  if (!userId) return new Response("Not found", { status: 404 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const row = await ownFile(userId, (await params).id);
  if (!row) return new Response("Not found", { status: 404 });
  const obj = await filesBucket().get(row.key);
  if (!obj || obj.customMetadata?.userId !== userId) return new Response("Not found", { status: 404 });

  const kind = row.kind as FileKind;
  const inline = kind === "pdf" && new URL(req.url).searchParams.get("view") === "1";
  const headers = new Headers({
    "content-type": CONTENT_TYPES[kind],
    "content-length": String(obj.size),
    "content-disposition": disposition(inline ? "inline" : "attachment", row.name),
    "cache-control": "private, no-store",
    // With the exact type and no sniffing, a file can only ever open as a PDF or download, never run as a page.
    "x-content-type-options": "nosniff",
  });
  return new Response(obj.body, { headers });
}

/** Deletes one of the user's own files and frees its space. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const row = await ownFile(userId, (await params).id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  await filesBucket().delete(row.key);
  await dropRow(row.id);
  return Response.json({ ok: true });
}
