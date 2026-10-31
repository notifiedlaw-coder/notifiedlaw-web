/** Something a user can @-mention in Notified AI: one of their files, a case brief or a library topic. */
export type RefKind = "file" | "case" | "topic";
export type Ref = { kind: RefKind; id: string; name: string; href: string };

/** What the @ list offers: a Ref with a line of detail and a rough size (characters), for the credit estimate. */
export type Mentionable = Ref & { sub: string; chars: number };

export const MAX_REFS = 5;

/** A link inside the site: one leading slash, not "//host" or "/\\host", which browsers open on another site. */
const localHref = (h: unknown) => typeof h === "string" && /^\/(?![/\\])/.test(h) ? h : "/files";

/** A stored `files` column as refs: older rows held only { id, name }, and were files. */
export function parseRefs(json: string): Ref[] {
  try {
    return (JSON.parse(json) as Partial<Ref>[]).flatMap((r): Ref[] =>
      r && typeof r.id === "string" && typeof r.name === "string"
        ? [{ kind: r.kind === "case" || r.kind === "topic" ? r.kind : "file", id: r.id, name: r.name, href: localHref(r.href) }]
        : []);
  } catch { return []; }
}
