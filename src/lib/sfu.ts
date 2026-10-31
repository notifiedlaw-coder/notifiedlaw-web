// Cloudflare Realtime SFU over HTTPS. The app secret stays on the server: browsers send their SDP here and the
// server talks to the SFU, so it decides who may publish and whose tracks each person may pull.
// Free of Next.js imports, so the Worker's cron (custom-worker.ts) can use it too.

export type SfuEnv = { REALTIME_APP_ID?: string; REALTIME_APP_SECRET?: string };
type Sdp = { type: "offer" | "answer"; sdp: string };
export type SfuTrack = { location?: "local" | "remote"; mid?: string; trackName?: string; sessionId?: string; errorCode?: string };

/** STUN for the browser. The SFU has public addresses, so TURN is only needed where UDP is blocked. */
export const ICE_SERVERS = [{ urls: "stun:stun.cloudflare.com:3478" }];

export const sfuConfigured = (env: SfuEnv) => !!(env.REALTIME_APP_ID && env.REALTIME_APP_SECRET);

async function sfu<T>(env: SfuEnv, method: string, path: string, body?: unknown): Promise<T> {
  if (!sfuConfigured(env)) throw new Error("Calls are not set up yet.");
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${env.REALTIME_APP_ID}${path}`, {
    method,
    headers: { authorization: `Bearer ${env.REALTIME_APP_SECRET}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SFU ${method} ${path.split("/").slice(0, 2).join("/")} ${res.status}`);
  return (await res.json()) as T;
}

export const newSession = (env: SfuEnv) => sfu<{ sessionId: string }>(env, "POST", "/sessions/new");

/** Publishes the browser's local tracks; the answer goes straight back to the browser. */
export const pushTracks = (env: SfuEnv, sessionId: string, offer: string, tracks: { mid: string; trackName: string }[]) =>
  sfu<{ sessionDescription: Sdp; tracks: SfuTrack[] }>(env, "POST", `/sessions/${sessionId}/tracks/new`, {
    sessionDescription: { type: "offer", sdp: offer },
    tracks: tracks.map((t) => ({ location: "local", ...t })),
  });

/** Subscribes a session to other sessions' tracks; usually returns an offer the browser must answer. */
export const pullTracks = (env: SfuEnv, sessionId: string, tracks: { sessionId: string; trackName: string }[]) =>
  sfu<{ sessionDescription?: Sdp; requiresImmediateRenegotiation: boolean; tracks: SfuTrack[] }>(env, "POST", `/sessions/${sessionId}/tracks/new`, {
    tracks: tracks.map((t) => ({ location: "remote", ...t })),
  });

export const renegotiate = (env: SfuEnv, sessionId: string, answer: string) =>
  sfu<unknown>(env, "PUT", `/sessions/${sessionId}/renegotiate`, { sessionDescription: { type: "answer", sdp: answer } });

/** Stops a session's published tracks, so nobody keeps receiving them. Best effort. */
export async function closeTracks(env: SfuEnv, sessionId: string, mids: string[]) {
  if (!mids.length || !sfuConfigured(env)) return;
  await sfu(env, "PUT", `/sessions/${sessionId}/tracks/close`, { tracks: mids.map((mid) => ({ mid })), force: true }).catch(() => {});
}
