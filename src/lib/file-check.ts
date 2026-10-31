/**
 * Checks for My Files uploads. Only PDF and DOCX are accepted, identified by their bytes rather than the name or
 * the browser's content type, and anything that can run code, reach the network or hide content is refused:
 * PDF scripts, launch and submit actions, embedded files and encryption (object streams are inflated so a script
 * cannot hide inside one); DOCX macros, ActiveX, OLE objects, DDE fields and external templates or images, plus
 * the ZIP tricks (traversal paths, duplicate names, zip bombs, encryption) used to slip those past a checker.
 * This is not an antivirus scan: it refuses the active content malware relies on, it does not look for it.
 */

export type FileKind = "pdf" | "docx";
export type CheckResult = { ok: true; kind: FileKind } | { ok: false; error: string };

const fail = (error: string): CheckResult => ({ ok: false, error });
const MB = 1024 * 1024;

/**
 * Bytes as a one-char-per-byte string, so PDF syntax (which is bytes, not UTF-8) can be searched with regexes.
 * Native decoding (windows-1252 differs from Latin-1 only above 0x7F, never for the ASCII the checks look for)
 * costs milliseconds where building the string chunk by chunk cost hundreds, which a Worker's CPU limit counts.
 */
const LATIN1 = new TextDecoder("latin1");
function latin1(b: Uint8Array) {
  return LATIN1.decode(b);
}

/**
 * Inflates `data` with the given format, keeping at most `max` bytes. Returns what was produced, whether the
 * stream ended cleanly, and whether it ran past `max` (then with no output, since the file is refused anyway).
 * Viewers show what they can of a broken stream, so a broken one still returns its partial output to be checked.
 */
async function inflate(data: Uint8Array, format: "deflate" | "deflate-raw", max: number) {
  const reader = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream(format)).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0, clean = true, over = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { over = true; void reader.cancel().catch(() => {}); break; }
      chunks.push(value);
    }
  } catch { clean = false; }
  if (over) return { out: new Uint8Array(0), clean, over };
  if (chunks.length === 1) return { out: chunks[0], clean, over };
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return { out, clean, over };
}

export async function checkFile(bytes: Uint8Array): Promise<CheckResult> {
  if (bytes.length < 8) return fail("This file is empty or too small to be a document.");
  const head = latin1(bytes.subarray(0, 8));
  if (head.startsWith("%PDF-")) return checkPdf(bytes);
  if (head.startsWith("PK\x03\x04")) return checkDocx(bytes);
  if (head === "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1") return fail("This is an old .doc file or a password-protected document. Save it as an unprotected .docx and try again.");
  return fail("Only PDF and Word (.docx) files can be uploaded.");
}

// ---- PDF -------------------------------------------------------------------------------------------------------

// Keys that run code, open other programs or files, send data out, or carry other files inside the PDF.
const PDF_BANNED = /\/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia|XFA|SubmitForm|ImportData|GoToE|GoToR|Sound|Movie)(?![^\s/[\]<>(){}%])/;
const PDF_ENCRYPT = /\/Encrypt(?![^\s/[\]<>(){}%])/;
// Every PDF name, so "#xx" escapes (/J#61vaScript is /JavaScript) can be decoded before matching.
const PDF_NAME = /\/(?:[^\s/[\]<>(){}%#]|#[0-9a-fA-F]{2})*#[0-9a-fA-F]{2}(?:[^\s/[\]<>(){}%#]|#[0-9a-fA-F]{2})*/g;
const decodeNames = (s: string) => !s.includes("#") ? s : s.replace(PDF_NAME, (n) => n.replace(/#([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))));

function pdfProblem(text: string): string | null {
  const t = decodeNames(text);
  if (PDF_ENCRYPT.test(t)) return "Password-protected or encrypted PDFs cannot be uploaded. Remove the protection and try again.";
  const m = PDF_BANNED.exec(t);
  if (m) return m[1] === "EmbeddedFile" || m[1] === "EmbeddedFiles" ? "PDFs with files attached inside them cannot be uploaded." : "This PDF contains scripts or interactive actions, so it cannot be uploaded. Print it to a new PDF and try again.";
  return null;
}

/**
 * Start of the `<< ... >>` dictionary that ends at `end` (exclusive), or -1. `work` is shared by the whole file, so
 * many streams with long dictionaries cannot each scan back 64 KB.
 */
function dictStart(s: string, end: number, work: { left: number }) {
  let depth = 0;
  for (let i = end - 1; i > 0 && end - i < 64 * 1024; i--) {
    if (--work.left < 0) return -1;
    if (s[i] === ">" && s[i - 1] === ">") { depth++; i--; }
    else if (s[i] === "<" && s[i - 1] === "<") { depth--; i--; if (depth === 0) return i; }
  }
  return -1;
}

async function checkPdf(bytes: Uint8Array): Promise<CheckResult> {
  const s = latin1(bytes);
  if (!s.slice(-1024).includes("%%EOF")) return fail("This PDF looks incomplete. Download or export it again and retry.");

  // Stream data (images, fonts, page content) is binary and is left out of the scan, where it would match by
  // chance. Objects can also be packed, compressed, inside object streams (/Type /ObjStm): those are inflated
  // and scanned like the rest.
  // Inflated object streams and dictionary scanning are both capped for the whole file, so a crafted PDF cannot
  // use more memory or CPU than a Worker has. Real PDFs come nowhere near either.
  let budget = 16 * MB, outside = "", from = 0;
  const work = { left: 16 * MB };
  for (let at = 0; (at = s.indexOf("stream", at)) >= 0; ) {
    const index = at;
    at += 6;
    // "endstream" holds "stream" too; the keyword proper follows the dictionary's ">>".
    const eol = s[at] === "\r" && s[at + 1] === "\n" ? 2 : s[at] === "\n" ? 1 : 0;
    if (!eol || !/>>\s*$/.test(s.slice(Math.max(0, index - 64), index))) continue;
    const m = { index };
    const dataStart = at + eol;
    const dataEnd = s.indexOf("endstream", dataStart);
    if (dataEnd < 0) return fail("This PDF looks damaged. Export it again and retry.");
    outside += s.slice(from, dataStart);
    from = at = dataEnd;
    const dictEnd = s.lastIndexOf(">>", m.index) + 2;
    const start = dictStart(s, dictEnd, work);
    if (work.left < 0) return fail("This PDF is too complex to check. Print it to a new PDF and try again.");
    if (start < 0) continue;
    const dict = decodeNames(s.slice(start, dictEnd));
    if (!/\/Type\s*\/ObjStm\b/.test(dict)) continue;
    const filter = /\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(dict)?.[1].replace(/[[\]\s]/g, "") ?? "";
    const data = bytes.subarray(dataStart, dataEnd);
    let text: string;
    if (!filter) text = latin1(data);
    else if (filter === "/FlateDecode" || filter === "/Fl") {
      const r = await inflate(data, "deflate", budget);
      if (r.over) return fail("This PDF is too complex to check. Print it to a new PDF and try again.");
      budget -= r.out.length;
      text = latin1(r.out);
    } else return fail("This PDF uses an unusual internal encoding. Print it to a new PDF and try again.");
    const p = pdfProblem(text);
    if (p) return fail(p);
  }
  const p = pdfProblem(outside + s.slice(from));
  return p ? fail(p) : { ok: true, kind: "pdf" };
}

// ---- DOCX ------------------------------------------------------------------------------------------------------

export type Entry = { name: string; method: number; comp: number; size: number; offset: number };

const DOCX_MAIN = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
// Parts Word only writes for macros and ActiveX controls.
const DOCX_BANNED = /(^|\/)(vbaProject\.bin|vbaData\.xml)$|(^|\/)activeX\//i;
// Embedded objects other than these are OLE packages, which can carry any program.
const EMBED_OK = /\.(xlsx|docx|pptx|png|jpe?g|gif|emf|wmf|bmp|tiff?)$/i;
// Field codes that pull data from other programs.
const DDE = /\bDDE(AUTO)?\b/i;

export function zipEntries(b: Uint8Array): Entry[] | string {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return "This Word file is damaged.";
  if (v.getUint16(eocd + 4, true) !== 0 || v.getUint16(eocd + 6, true) !== 0) return "This Word file is damaged.";
  const count = v.getUint16(eocd + 10, true);
  const cdOffset = v.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOffset === 0xffffffff) return "This Word file is too large or unusual to check.";
  if (count > 5000) return "This Word file has too many parts to check.";

  const entries: Entry[] = [];
  const seen = new Set<string>();
  const dec = new TextDecoder("utf-8", { fatal: true });
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > b.length || v.getUint32(p, true) !== 0x02014b50) return "This Word file is damaged.";
    const flags = v.getUint16(p + 8, true);
    const method = v.getUint16(p + 10, true);
    const comp = v.getUint32(p + 20, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const nameBytes = b.subarray(p + 46, p + 46 + nameLen);
    let name: string;
    try { name = dec.decode(nameBytes); } catch { return "This Word file is damaged."; }
    p += 46 + nameLen + extraLen + commentLen;

    if (flags & 1) return "Password-protected Word files cannot be uploaded. Remove the password and try again.";
    if (method !== 0 && method !== 8) return "This Word file uses an unusual compression method.";
    if (comp === 0xffffffff || size === 0xffffffff) return "This Word file is too large or unusual to check.";
    // No absolute paths, no "..", no backslashes or control characters: a name must stay inside the package.
    if (!name || name.startsWith("/") || /(^|\/)\.\.(\/|$)|\\|[\x00-\x1f]/.test(name)) return "This Word file contains an unsafe file path.";
    const lower = name.toLowerCase();
    if (seen.has(lower)) return "This Word file contains duplicate parts.";
    seen.add(lower);
    // A small part that expands enormously is a zip bomb.
    if (size > MB && size > comp * 100) return "This Word file expands to an unsafe size.";

    // The local header must agree with the central directory, so a checker and Word read the same bytes.
    if (offset + 30 > b.length || v.getUint32(offset, true) !== 0x04034b50) return "This Word file is damaged.";
    const ln = v.getUint16(offset + 26, true), le = v.getUint16(offset + 28, true);
    if (ln !== nameLen || latin1(b.subarray(offset + 30, offset + 30 + ln)) !== latin1(nameBytes)) return "This Word file is damaged.";
    const dataAt = offset + 30 + ln + le;
    if (dataAt + comp > b.length) return "This Word file is damaged.";
    entries.push({ name, method, comp, size, offset: dataAt });
  }
  if (entries.reduce((t, e) => t + e.size, 0) > 250 * MB) return "This Word file expands to an unsafe size.";
  return entries;
}

export async function readEntry(b: Uint8Array, e: Entry, max: number): Promise<string | null> {
  const data = b.subarray(e.offset, e.offset + e.comp);
  if (e.method === 0) return e.size > max ? null : new TextDecoder().decode(data);
  const r = await inflate(data, "deflate-raw", Math.min(max, e.size));
  // Bytes that do not inflate to the size the directory promises are refused rather than half-read.
  if (r.over || !r.clean || r.out.length !== e.size) return null;
  return new TextDecoder().decode(r.out);
}

/** A tag's attributes. Each name must follow whitespace, so the scan stays linear however the tag is padded. */
const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/\s([\w:]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], m[2] ?? m[3]]));
/** Longest tag read for its attributes; real ones are a few hundred bytes. */
const MAX_TAG = 16 * 1024;
/** Most of one text part (document, header, notes) inflated for checking. */
const MAX_PART = 24 * MB;

async function checkDocx(bytes: Uint8Array): Promise<CheckResult> {
  const entries = zipEntries(bytes);
  if (typeof entries === "string") return fail(entries);
  const byName = new Map(entries.map((e) => [e.name, e]));

  const types = byName.get("[Content_Types].xml");
  if (!types || !byName.has("word/document.xml")) return fail("Only Word (.docx) documents can be uploaded. This looks like a different kind of file.");
  const ct = await readEntry(bytes, types, MB);
  if (ct === null) return fail("This Word file is damaged.");
  if (/macroEnabled|vbaProject/i.test(ct)) return fail("Word files with macros cannot be uploaded. Save it as a plain .docx and try again.");
  if (!ct.includes(DOCX_MAIN)) return fail("Only Word documents (.docx) can be uploaded, not templates or other Office files.");

  for (const e of entries) {
    if (DOCX_BANNED.test(e.name)) return fail("Word files with macros or ActiveX controls cannot be uploaded. Save it as a plain .docx and try again.");
    if (/^word\/embeddings\//i.test(e.name) && !EMBED_OK.test(e.name)) return fail("This Word file has an embedded object that could run a program. Remove it and try again.");
  }

  // Relationships are how a .docx points outside itself: a remote template, an OLE link or a remote image runs
  // or fetches on open. Only ordinary web and email links may point outside.
  for (const e of entries) {
    if (!e.name.endsWith(".rels")) continue;
    const xml = await readEntry(bytes, e, 4 * MB);
    if (xml === null) return fail("This Word file is damaged.");
    for (const [tag] of xml.matchAll(/<(?:\w+:)?Relationship\b[^<>]*>?/g)) {
      if (tag.length > MAX_TAG || !tag.endsWith(">")) return fail("This Word file is damaged or too unusual to check.");
      const a = attrs(tag);
      if (a.TargetMode !== "External") continue;
      const hyperlink = a.Type?.endsWith("/hyperlink");
      if (!hyperlink) return fail("This Word file loads content from outside the document (a remote template, object or image), so it cannot be uploaded.");
      if (!/^(https?:|mailto:|#)/i.test((a.Target ?? "").trim())) return fail("This Word file has a link to a local file or an unsafe address. Remove it and try again.");
    }
  }

  for (const e of entries) {
    if (!/^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(e.name)) continue;
    const xml = await readEntry(bytes, e, MAX_PART);
    if (xml === null) return fail("This Word file is damaged or too large to check.");
    // A field's code can be split across many runs, so join each document's field text before matching.
    if (!/instr/.test(xml)) continue;
    // [^<>] keeps each match inside one tag, so an unclosed tag cannot make every match scan to the end.
    const codes = [...xml.matchAll(/<w:instrText\b[^<>]*>([^<]*)<\/w:instrText>/g)].map((m) => m[1]).join("")
      + [...xml.matchAll(/<w:fldSimple\b[^<>]*\bw:instr\s*=\s*"([^"]*)"/g)].map((m) => m[1]).join(" ");
    if (DDE.test(codes)) return fail("This Word file has DDE fields that can run programs, so it cannot be uploaded.");
  }
  return { ok: true, kind: "docx" };
}

/** Cleans an uploaded file's name for display; null unless it ends in the extension its contents call for. */
export function cleanFileName(raw: string, kind: FileKind): string | null {
  const name = raw.normalize("NFC").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "").replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  const m = /^(.*?)\.(pdf|docx)$/i.exec(name);
  if (!m || m[2].toLowerCase() !== kind) return null;
  const stem = m[1].replace(/^[.\s]+/, "").slice(0, 120).trim() || "Untitled";
  return `${stem}.${kind}`;
}
