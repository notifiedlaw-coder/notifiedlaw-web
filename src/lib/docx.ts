/**
 * A minimal .docx writer: headings, paragraphs, bullets and one table, in a ZIP with stored (uncompressed) parts.
 * Enough for generated documents such as case comparisons; the output passes the My Files content check
 * (src/lib/file-check.ts) because it has no macros, links or embedded objects.
 */

export type Block =
  | { t: "title" | "h1" | "h2" | "p" | "note" | "bullet"; text: string }
  | { t: "table"; head: string[]; rows: string[][] };

const esc = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const run = (text: string, o: { b?: boolean; i?: boolean; size?: number; color?: string } = {}) =>
  `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}${o.size ? `<w:sz w:val="${o.size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const para = (inner: string, o: { after?: number; before?: number; ind?: number } = {}) =>
  `<w:p><w:pPr><w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 120}" w:line="276" w:lineRule="auto"/>${o.ind ? `<w:ind w:left="${o.ind}" w:hanging="260"/>` : ""}</w:pPr>${inner}</w:p>`;

function block(b: Block): string {
  switch (b.t) {
    case "title": return para(run(b.text, { b: true, size: 40 }), { after: 80 });
    case "h1": return para(run(b.text, { b: true, size: 28 }), { before: 280, after: 100 });
    case "h2": return para(run(b.text, { b: true, size: 24 }), { before: 160, after: 60 });
    case "note": return para(run(b.text, { i: true, size: 18, color: "6E6E73" }), { after: 80 });
    case "bullet": return para(run("•  " + b.text), { ind: 360, after: 80 });
    case "p": return para(run(b.text));
    case "table": {
      const widths = [1900, 3730, 3730];
      const cell = (text: string, i: number, head: boolean) =>
        `<w:tc><w:tcPr><w:tcW w:w="${widths[i] ?? 3000}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F7"/>' : ""}</w:tcPr>${para(run(text, { b: head || i === 0, size: 20 }), { after: 40 })}</w:tc>`;
      const row = (cells: string[], head: boolean) => `<w:tr>${cells.map((c, i) => cell(c, i, head)).join("")}</w:tr>`;
      const border = ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D1D1D6"/>`).join("");
      return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>${row(b.head, true)}${b.rows.map((r) => row(r, false)).join("")}</w:tbl>${para("", { after: 60 })}`;
    }
  }
}

// ---- ZIP (stored) ----------------------------------------------------------------------------------------------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files: { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [], centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data);
    const l = new DataView(new ArrayBuffer(30));
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true); l.setUint16(8, 0, true);
    l.setUint32(14, crc, true); l.setUint32(18, f.data.length, true); l.setUint32(22, f.data.length, true); l.setUint16(26, name.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    locals.push(new Uint8Array(l.buffer), name, f.data);
    centrals.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = centrals.reduce((n, p) => n + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, new Uint8Array(e.buffer)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

/** The blocks as a .docx file's bytes (A4, Calibri 11 pt). */
export function buildDocx(blocks: Block[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${blocks.map(block).join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1273" w:bottom="1300" w:left="1273" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zip([
    { name: "[Content_Types].xml", data: enc.encode(types) },
    { name: "_rels/.rels", data: enc.encode(rels) },
    { name: "word/document.xml", data: enc.encode(doc) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
    { name: "word/styles.xml", data: enc.encode(styles) },
  ]);
}
