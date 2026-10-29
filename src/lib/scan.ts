import { getCloudflareContext } from "@opennextjs/cloudflare";

export type ScanResult = { ok: true } | { ok: false; infected: boolean; error: string };

/**
 * Scans an upload with ClamAV in the Scanner container (custom-worker.ts). Fails closed: if the scanner cannot
 * be reached or errors, the file is refused. `next dev` has no containers, so local uploads skip the scan.
 */
export async function scanFile(bytes: Uint8Array<ArrayBuffer>): Promise<ScanResult> {
  if (process.env.NODE_ENV !== "production") return { ok: true };
  const ns = getCloudflareContext().env.SCANNER as CloudflareEnv["SCANNER"] | undefined;
  const unavailable = { ok: false as const, infected: false, error: "Virus scanning is unavailable right now, so the file was not uploaded. Try again in a minute." };
  if (!ns) return unavailable;
  try {
    const res = await ns.get(ns.idFromName("clamav")).fetch("http://scanner/scan", { method: "POST", body: bytes });
    const r = (await res.json()) as { result?: string; signature?: string };
    if (r.result === "clean") return { ok: true };
    if (r.result === "infected") {
      console.warn("upload refused by ClamAV", r.signature);
      return { ok: false, infected: true, error: "This file contains malware, so it was not uploaded." };
    }
    return unavailable;
  } catch {
    return unavailable;
  }
}
