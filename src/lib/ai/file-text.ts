import { eq } from "drizzle-orm";
import { fileText, userFile } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { filesBucket } from "@/lib/files";
import { readEntry, zipEntries } from "@/lib/file-check";
import { kimiExtract } from "@/lib/ai/kimi";

/** Most of one document handed to the model, in characters (about 7,500 words). */
export const MAX_DOC_CHARS = 40_000;
const MB = 1024 * 1024;

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** The body text of a .docx: paragraphs on their own lines, tabs kept, everything else dropped. */
export async function docxText(bytes: Uint8Array): Promise<string> {
  const entries = zipEntries(bytes);
  if (typeof entries === "string") throw new Error(entries);
  const main = entries.find((e) => e.name === "word/document.xml");
  const xml = main && (await readEntry(bytes, main, 64 * MB));
  if (!xml) throw new Error("no document.xml");
  return decode(xml.replace(/<w:tab\b[^>]*\/>/g, "\t").replace(/<w:br\b[^>]*\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** A My Files document's text for the model: from the cache, else read from R2 (a .docx here, a PDF by Kimi) and cached. */
export async function textOf(file: typeof userFile.$inferSelect): Promise<{ text: string; truncated: boolean }> {
  const db = getDb();
  const [hit] = await db.select().from(fileText).where(eq(fileText.fileId, file.id));
  let text = hit?.sha256 === file.sha256 ? hit.text : null;
  if (text === null) {
    const obj = await filesBucket().get(file.key);
    if (!obj) throw new Error("file missing from storage");
    const bytes = new Uint8Array(await obj.arrayBuffer());
    text = (file.kind === "docx" ? await docxText(bytes) : await kimiExtract(bytes, file.name)).trim();
    await db.insert(fileText).values({ fileId: file.id, sha256: file.sha256, text, createdAt: new Date() })
      .onConflictDoUpdate({ target: fileText.fileId, set: { sha256: file.sha256, text, createdAt: new Date() } });
  }
  return { text: text.slice(0, MAX_DOC_CHARS), truncated: text.length > MAX_DOC_CHARS };
}
