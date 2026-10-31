"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CallInfo, CallPeer } from "@/lib/friend-view";
import { Avatar } from "./avatar";
import { BARS, better, measure, playTone, useSpeaking, type Net, type Quality } from "./call-media";
import { Sheet } from "./sheet";

/** How often the app checks for calls ringing for the user, while visible and not in a call. */
const RING_POLL_MS = 5_000;
/** How often the call screen refreshes who is in the call (this also keeps the user present). */
const CALL_POLL_MS = 3_000;

/** The call on screen; `outgoing` when the user placed it, so they hear it ring. */
type Active = { call: CallInfo; title: string; stream: MediaStream; outgoing: boolean };
type Ctx = {
  /** Starts (or joins the open) voice call with a friend or a group. `title` names it on the call screen. In a call already, opens it. */
  start: (target: { friendId?: string; groupId?: string }, title: string) => void;
  inCall: boolean;
  error: string;
};
const CallCtx = createContext<Ctx>({ start: () => {}, inCall: false, error: "" });
export const useCalls = () => useContext(CallCtx);

const post = async <T,>(url: string, body?: unknown): Promise<T> => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(d.error ?? "The call could not connect. Try again.");
  return d;
};

/** Why the microphone sheet is showing: before the browser asks, after it was blocked, or with no microphone at all. */
type MicState = "prompt" | "denied" | "missing";
type MicAsk = { state: MicState; run: (stream: MediaStream) => void; cancel?: () => void };

const getMic = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
/** The microphone permission as the browser has it, where the browser says (Safari before 16 does not). */
async function micPermission(): Promise<PermissionState | "unknown"> {
  try { return (await navigator.permissions.query({ name: "microphone" as PermissionName })).state; } catch { return "unknown"; }
}

/** Listens for incoming calls, and shows the incoming-call banner, the microphone sheet and the call screen over the app. */
export function CallProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [ringing, setRinging] = useState<CallInfo[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Active | null>(null);
  const [mini, setMini] = useState(false);
  const [mic, setMic] = useState<MicAsk | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || active) return;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/calls/ring").then((r) => (r.ok ? (r.json() as Promise<{ calls: CallInfo[] }>) : null)).then((d) => d && setRinging(d.calls)).catch(() => {});
    };
    poll();
    const t = setInterval(poll, RING_POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", poll); };
  }, [enabled, active]);

  const flash = useCallback((text: string) => { setError(text); setTimeout(() => setError(""), 5000); }, []);

  // Asking for the microphone from a tap makes the browser show its Allow prompt.
  const openMic = useCallback(async (ask: Omit<MicAsk, "state">) => {
    try {
      const stream = await getMic();
      setMic(null);
      ask.run(stream);
    } catch (e) {
      setMic({ ...ask, state: e instanceof DOMException && (e.name === "NotFoundError" || e.name === "OverconstrainedError") ? "missing" : "denied" });
    }
  }, []);

  /** Runs `run` with the microphone: straight away once allowed, else after the sheet explains and the browser asks. */
  const withMic = useCallback(async (run: MicAsk["run"], cancel?: () => void) => {
    if (!navigator.mediaDevices?.getUserMedia) return setMic({ state: "missing", run, cancel });
    const state = await micPermission();
    if (state === "granted") return openMic({ run, cancel });
    setMic({ state: state === "denied" ? "denied" : "prompt", run, cancel });
  }, [openMic]);

  const start = useCallback((target: { friendId?: string; groupId?: string }, title: string) => {
    if (active) return setMini(false);
    setError("");
    void withMic((stream) => {
      post<{ call: CallInfo }>("/api/calls", target)
        .then(({ call }) => setActive({ call, title, stream, outgoing: true }))
        .catch((e: Error) => { stream.getTracks().forEach((t) => t.stop()); flash(e.message); });
    });
  }, [active, withMic, flash]);

  const incoming = active ? null : ringing.find((c) => !dismissed.has(c.id)) ?? null;
  const dismiss = (c: CallInfo) => {
    setDismissed((s) => new Set(s).add(c.id));
    if (!c.groupId) void post(`/api/calls/${c.id}/decline`).catch(() => {});
  };
  const pickUp = (c: CallInfo) => {
    setDismissed((s) => new Set(s).add(c.id));
    void withMic((stream) => setActive({ call: c, title: c.groupName ?? c.callerName, stream, outgoing: false }), c.groupId ? undefined : () => dismiss(c));
  };

  // Ring (where the browser allows sound) and vibrate (Android) while a call is coming in.
  const ringingId = incoming?.id;
  useEffect(() => {
    if (!ringingId) return;
    const stop = playTone("incoming");
    const buzz = () => navigator.vibrate?.([300, 150, 300]);
    buzz();
    const t = setInterval(buzz, 2000);
    return () => { stop(); clearInterval(t); navigator.vibrate?.(0); };
  }, [ringingId]);

  const close = useCallback(() => { setActive(null); setMini(false); }, []);
  const value = useMemo(() => ({ start, inCall: !!active, error }), [start, active, error]);
  return (
    <CallCtx.Provider value={value}>
      {children}
      {error && !active && <div role="alert" className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[70] mx-auto max-w-[420px] rounded-[16px] bg-ink px-4 py-3 text-[14px] text-canvas shadow-2xl">{error}</div>}
      {incoming && (
        <div role="alertdialog" aria-label="Incoming call" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] mx-auto flex max-w-[440px] items-center gap-3 rounded-[22px] bg-[#1c1c1e]/95 p-3 pl-4 text-white shadow-2xl backdrop-blur-xl" style={{ animation: "tt-sheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)" }}>
          <Avatar id={incoming.callerId} name={incoming.callerName} size={44} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[16px] font-semibold">{incoming.groupName ?? incoming.callerName}</span>
            <span className="truncate text-[13px] text-white/70">{incoming.groupId ? `${incoming.callerName} started a voice call` : "Voice call"}</span>
          </span>
          <button type="button" onClick={() => dismiss(incoming)} aria-label={incoming.groupId ? "Ignore" : "Decline"} className="grid size-11 shrink-0 place-items-center rounded-full border-0 bg-[#ff3b30] text-white"><HangUp /></button>
          <button type="button" onClick={() => pickUp(incoming)} aria-label={incoming.groupId ? "Join" : "Answer"} className="grid size-11 shrink-0 place-items-center rounded-full border-0 bg-[#34c759] text-white"><Handset /></button>
        </div>
      )}
      {mic && <MicSheet state={mic.state} onAllow={() => void openMic(mic)} onClose={() => { setMic(null); mic.cancel?.(); }} />}
      {active && <CallScreen active={active} mini={mini} setMini={setMini} onClose={close} />}
    </CallCtx.Provider>
  );
}

const MIC_TEXT: Record<MicState, { title: string; body: string; action: string }> = {
  prompt: {
    title: "Allow your microphone",
    body: "Calls are voice only. Your browser will ask to use your microphone. Choose Allow so your friends can hear you.",
    action: "Continue",
  },
  denied: {
    title: "Your microphone is blocked",
    body: "Your browser has blocked the microphone for Notified Law. Tap the icon beside the web address (on iPhone, aA then Website Settings), set Microphone to Allow, then try again.",
    action: "Try again",
  },
  missing: {
    title: "No microphone found",
    body: "Connect a microphone or headset, or use a phone or computer with one, then try again.",
    action: "Try again",
  },
};

/** Explains why calls need the microphone, then asks the browser, which shows its own Allow prompt. */
function MicSheet({ state, onAllow, onClose }: { state: MicState; onAllow: () => void; onClose: () => void }) {
  const t = MIC_TEXT[state];
  return (
    <Sheet label={t.title} onClose={onClose}>
      <div className="flex flex-col items-center gap-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-center">
        <span className={`grid size-16 place-items-center rounded-full ${state === "prompt" ? "bg-green/15 text-green" : "bg-red/10 text-red"}`}><MicIcon /></span>
        <h2 className="m-0 text-[20px] font-semibold">{t.title}</h2>
        <p className="m-0 max-w-[340px] text-[15px] leading-snug text-muted">{t.body}</p>
        <div className="mt-2 flex w-full max-w-[340px] flex-col gap-2">
          <button type="button" onClick={onAllow} className="h-12 rounded-[14px] border-0 bg-blue text-[17px] font-semibold text-white active:opacity-70">{t.action}</button>
          <button type="button" onClick={onClose} className="h-12 rounded-[14px] border-0 bg-transparent text-[17px] text-link active:opacity-60">Not now</button>
        </div>
      </div>
    </Sheet>
  );
}

const END_TEXT: Record<string, string> = { declined: "Call declined", missed: "No answer", time: "Calls end after 3 hours", ended: "Call ended" };
const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(r).padStart(2, "0")}`;
};

/** How often the connection is graded. */
const STATS_MS = 2_000;
/** A connection that stays disconnected this long is rebuilt; after this many tries in a row the call is given up. */
const DROP_MS = 5_000;
const MAX_RETRIES = 3;

type Status = "connecting" | "live" | "reconnecting" | "ended";
type Corner = "tl" | "tr" | "bl" | "br";
const CORNER_KEY = "nl-call-corner";
// Clear of the phone toolbar and tab bar; the side gutter matches the page's.
const CORNERS: Record<Corner, string> = {
  tl: "left-[max(0.75rem,env(safe-area-inset-left))] top-[calc(env(safe-area-inset-top)+3.75rem)] md:left-5 md:top-5",
  tr: "right-[max(0.75rem,env(safe-area-inset-right))] top-[calc(env(safe-area-inset-top)+3.75rem)] md:right-5 md:top-5",
  bl: "left-[max(0.75rem,env(safe-area-inset-left))] bottom-[calc(env(safe-area-inset-bottom)+3.75rem)] md:left-5 md:bottom-5",
  br: "right-[max(0.75rem,env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+3.75rem)] md:right-5 md:bottom-5",
};
/** Phones on their side, and other short screens, get a tighter call screen. */
const SHORT = "(max-height: 560px)";
function useMedia(query: string) {
  return useSyncExternalStore(
    (on) => { const m = matchMedia(query); m.addEventListener("change", on); return () => m.removeEventListener("change", on); },
    () => matchMedia(query).matches,
    () => false,
  );
}

const QUALITY_TEXT: Record<Quality, string> = { good: "Good connection", fair: "Fair connection", poor: "Poor connection", lost: "No connection" };

/**
 * The call itself: one RTCPeerConnection to Cloudflare's SFU. The microphone, already allowed, is published once; other
 * people's audio is pulled as they appear in the polled call state. SDP exchanges run one at a time. A dropped
 * connection is rebuilt with a fresh session. Minimised, the call carries on in a small player the user can drag to
 * any corner while using the rest of the app.
 */
function CallScreen({ active, mini, setMini, onClose }: { active: Active; mini: boolean; setMini: (m: boolean) => void; onClose: () => void }) {
  const callId = active.call.id;
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [audio, setAudio] = useState<Record<string, MediaStreamTrack>>({});
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<Status>("connecting");
  const [attempt, setAttempt] = useState(0);
  const [net, setNet] = useState<Net | null>(null);
  const [ended, setEnded] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [talkingSince, setTalkingSince] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState(active.call.endsAt);
  const [mine] = useState(() => active.stream.getAudioTracks()[0]);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream>(active.stream);
  const pulled = useRef(new Set<string>());
  const byMid = useRef(new Map<string, string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const closed = useRef(false);
  const retries = useRef(0);
  const drop = useRef<ReturnType<typeof setTimeout>>(undefined);

  const serial = useCallback(<T,>(job: () => Promise<T>) => {
    const next = queue.current.then(job, job);
    queue.current = next.catch(() => {});
    return next;
  }, []);

  const hangUp = useCallback((reason?: string) => {
    if (closed.current) return;
    closed.current = true;
    clearTimeout(drop.current);
    local.current.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    void post(`/api/calls/${callId}/leave`).catch(() => {});
    setStatus("ended");
    setEnded(reason ?? "Call ended");
    setTimeout(onClose, 1400);
  }, [callId, onClose]);

  // Throws the connection away and joins again: a new SFU session, publish, and pull everyone afresh.
  const reconnect = useCallback(() => {
    if (closed.current) return;
    clearTimeout(drop.current);
    if (retries.current >= MAX_RETRIES) return hangUp("Connection lost");
    retries.current++;
    pc.current?.close();
    pc.current = null;
    pulled.current.clear();
    byMid.current.clear();
    setAudio({});
    setNet((n) => ({ rtt: n?.rtt ?? null, loss: n?.loss ?? 0, quality: "lost" }));
    setStatus("reconnecting");
    setAttempt((a) => a + 1);
  }, [hangUp]);

  // Connect: a session at the SFU, then publish the microphone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const j = await post<{ sessionId: string; endsAt: number; iceServers: RTCIceServer[] }>(`/api/calls/${callId}/join`);
        if (cancelled) return;
        setEndsAt(j.endsAt);
        const conn = new RTCPeerConnection({ iceServers: j.iceServers, bundlePolicy: "max-bundle" });
        pc.current = conn;
        conn.ontrack = (e) => {
          const who = e.transceiver.mid ? byMid.current.get(e.transceiver.mid) : undefined;
          if (who) setAudio((a) => ({ ...a, [who]: e.track }));
        };
        conn.onconnectionstatechange = () => {
          if (pc.current !== conn) return;
          const s = conn.connectionState;
          if (s === "failed") reconnect();
          else if (s === "disconnected") {
            setNet((n) => ({ rtt: n?.rtt ?? null, loss: n?.loss ?? 0, quality: "lost" }));
            clearTimeout(drop.current);
            drop.current = setTimeout(() => { if (pc.current === conn && conn.connectionState !== "connected") reconnect(); }, DROP_MS);
          } else if (s === "connected") clearTimeout(drop.current);
        };
        const sending = local.current.getAudioTracks().map((t) => conn.addTransceiver(t, { direction: "sendonly" }));
        await serial(async () => {
          await conn.setLocalDescription(await conn.createOffer());
          const res = await post<{ sdp: string }>(`/api/calls/${callId}/publish`, {
            sdp: conn.localDescription!.sdp, tracks: sending.map((tc) => ({ mid: tc.mid, name: "audio" })),
          });
          await conn.setRemoteDescription({ type: "answer", sdp: res.sdp });
        });
        if (cancelled) return;
        retries.current = 0;
        setStatus("live");
      } catch (e) {
        if (cancelled || closed.current) return;
        if (attempt > 0) { setTimeout(reconnect, 2000); return; } // still offline: try again shortly
        setError(e instanceof Error ? e.message : "The call could not connect.");
        hangUp("Could not connect");
      }
    })();
    return () => { cancelled = true; };
  }, [callId, attempt, hangUp, reconnect, serial]);

  // Back online after a drop: rebuild straight away rather than waiting.
  useEffect(() => {
    const online = () => { if (pc.current?.connectionState !== "connected") reconnect(); };
    const offline = () => setNet((n) => ({ rtt: n?.rtt ?? null, loss: n?.loss ?? 0, quality: "lost" }));
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [reconnect]);

  // Poll who is in the call; pull anyone new.
  useEffect(() => {
    if (status !== "live") return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/calls/${callId}`);
        if (r.status === 404 || r.status === 410) return hangUp();
        if (!r.ok) return;
        const d = (await r.json()) as { call: CallInfo; peers: CallPeer[] };
        if (d.call.endedAt) return hangUp(END_TEXT[d.call.endReason ?? "ended"]);
        setPeers(d.peers);
        if (d.peers.length) setTalkingSince((t) => t ?? Date.now());
        setAudio((a) => Object.fromEntries(Object.entries(a).filter(([id]) => d.peers.some((p) => p.userId === id))));
        const wants = d.peers.filter((p) => p.tracks.includes("audio") && !pulled.current.has(p.session));
        if (!wants.length || !pc.current) return;
        wants.forEach((w) => pulled.current.add(w.session));
        await serial(async () => {
          const conn = pc.current;
          if (!conn) return;
          try {
            const res = await post<{ sdp: string | null; tracks: { mid: string; userId: string }[] }>(`/api/calls/${callId}/subscribe`, { tracks: wants.map((w) => ({ userId: w.userId, name: "audio" })) });
            res.tracks.forEach((t) => byMid.current.set(t.mid, t.userId));
            if (res.sdp) {
              await conn.setRemoteDescription({ type: "offer", sdp: res.sdp });
              await conn.setLocalDescription(await conn.createAnswer());
              await post(`/api/calls/${callId}/answer`, { sdp: conn.localDescription!.sdp });
            }
          } catch {
            wants.forEach((w) => pulled.current.delete(w.session)); // try again on the next poll
          }
        });
      } catch {}
    };
    void poll();
    const t = setInterval(poll, CALL_POLL_MS);
    return () => clearInterval(t);
  }, [status, callId, hangUp, serial]);

  // Grade the connection every two seconds; a warning needs two bad readings in a row.
  useEffect(() => {
    if (status !== "live") return;
    const totals = { lost: 0, received: 0 };
    let last: Quality = "good";
    const t = setInterval(async () => {
      const conn = pc.current;
      if (!conn) return;
      if (!navigator.onLine || conn.connectionState === "disconnected") return setNet((n) => ({ rtt: n?.rtt ?? null, loss: n?.loss ?? 0, quality: "lost" }));
      const m = await measure(conn, totals);
      if (!m) return;
      const shown = better(m.quality, last);
      last = m.quality;
      setNet({ ...m, quality: shown });
    }, STATS_MS);
    return () => clearInterval(t);
  }, [status]);

  // The caller hears ringing until someone picks up.
  const ringing = status === "live" && active.outgoing && !active.call.groupId && !peers.length && talkingSince === null;
  useEffect(() => (ringing ? playTone("ringback") : undefined), [ringing]);

  // The clock, and the 3-hour limit.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= endsAt) hangUp(END_TEXT.time);
    }, 1000);
    return () => clearInterval(t);
  }, [hangUp, endsAt]);

  // Closing the tab leaves the call, so the others are not left waiting.
  useEffect(() => {
    const bye = () => { if (!closed.current) navigator.sendBeacon(`/api/calls/${callId}/leave`); };
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, [callId]);
  useEffect(() => () => { if (!closed.current) { closed.current = true; clearTimeout(drop.current); local.current.getTracks().forEach((t) => t.stop()); pc.current?.close(); void post(`/api/calls/${callId}/leave`).catch(() => {}); } }, [callId]);

  // Escape minimises the full screen, as swiping down does on a phone.
  useEffect(() => {
    if (mini) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMini(true); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [mini, setMini]);

  const short = useMedia(SHORT);

  // Keep the screen on during the call: a phone that locks pauses the page, and the call drops. Released on hang-up.
  const over = status === "ended";
  useEffect(() => {
    if (over || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const take = () => { if (document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    take();
    document.addEventListener("visibilitychange", take);
    return () => { document.removeEventListener("visibilitychange", take); void lock?.release().catch(() => {}); };
  }, [over]);

  const meters = useMemo<[string, MediaStreamTrack][]>(() => [...Object.entries(audio), ...(mine ? [["me", mine] as [string, MediaStreamTrack]] : [])], [audio, mine]);
  const speaking = useSpeaking(meters);

  function toggleMute() {
    const t = local.current.getAudioTracks()[0];
    if (t) t.enabled = muted;
    setMuted(!muted);
  }

  const left = endsAt - now;
  const sub = status === "ended" ? ended
    : status === "connecting" ? "Connecting…"
    : status === "reconnecting" ? "Reconnecting…"
    : !peers.length ? (active.call.groupId ? "Waiting for others to join…" : talkingSince ? "Waiting for them to come back…" : "Ringing…")
    : talkingSince ? hms(now - talkingSince) : "";
  const quality: Quality | null = status === "reconnecting" ? "lost" : status === "live" ? net?.quality ?? "good" : null;
  const warn = quality === "poor" || quality === "lost";
  const focus = peers.find((p) => speaking.has(p.userId)) ?? peers[0];
  // Everyone's audio sits outside both views, so switching between them never interrupts it.
  const voices = <div hidden>{peers.map((p) => <PeerAudio key={p.userId} track={audio[p.userId]} />)}</div>;

  if (mini) {
    return (
      <>
        {voices}
        <MiniPlayer label={`Call with ${active.title}`} onExpand={() => setMini(false)} actions={<>
          <MiniButton label={muted ? "Unmute" : "Mute"} on={muted} onClick={toggleMute}><MicIcon off={muted} size={18} /></MiniButton>
          <MiniButton label="End call" danger onClick={() => hangUp()}><HangUp size={20} /></MiniButton>
        </>}>
          <span className={`relative shrink-0 rounded-full transition-shadow ${focus && speaking.has(focus.userId) ? "shadow-[0_0_0_3px_#34c759]" : ""}`}>
            {focus ? <Avatar id={focus.userId} name={focus.name} src={focus.avatar} size={40} />
              : <Avatar id={active.call.groupId ?? active.call.callerId} name={active.title} size={40} group={!!active.call.groupId} />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="hidden truncate text-[15px] font-semibold sm:block">{active.title}</span>
            <span className={`flex items-center gap-1.5 text-[14px] font-semibold tabular-nums sm:text-[12px] sm:font-normal ${warn ? "text-[#ffb340]" : "text-white sm:text-white/70"}`}>
              {quality && <Signal quality={quality} size={11} />}
              <span className="truncate">{warn && status === "live" ? QUALITY_TEXT[quality!] : sub}</span>
            </span>
          </span>
        </MiniPlayer>
      </>
    );
  }

  return (
    <>
    {voices}
    <div role="dialog" aria-modal="true" aria-label={`Call with ${active.title}`} className="fixed inset-0 z-[80] flex flex-col bg-[radial-gradient(120%_80%_at_50%_0%,#1f2a3a_0%,#0b0b0f_60%)] text-white" style={{ animation: "tt-sheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)" }}>
      <header className="flex shrink-0 items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => setMini(true)} aria-label="Minimise call" title="Minimise (Esc)" className="grid size-10 place-items-center rounded-full border-0 bg-white/10 text-white active:opacity-60">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.5 6 8 10.5 12.5 6" /></svg>
        </button>
        {quality && (
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80" title={net?.rtt != null ? `${net.rtt} ms round trip · ${Math.round(net.loss * 100)}% lost` : undefined}>
            <Signal quality={quality} size={13} />{QUALITY_TEXT[quality]}
          </span>
        )}
      </header>

      <div className="flex shrink-0 flex-col items-center gap-1 px-4 pb-2 pt-3 text-center [@media(max-height:560px)]:pt-0">
        <span className="max-w-full truncate text-[24px] font-semibold tracking-[-0.01em] [@media(max-height:560px)]:text-[19px]">{active.title}</span>
        <span className="text-[15px] tabular-nums text-white/70">{sub}</span>
        {warn && status !== "ended" && (
          <span role="status" className="mt-2 flex items-center gap-2 rounded-full bg-[#ff9500]/15 px-3.5 py-1.5 text-[13px] font-medium text-[#ffb340]">
            <Signal quality={quality!} size={12} />
            {status === "reconnecting" ? "Connection dropped. Reconnecting…" : quality === "lost" ? "No connection. Trying to reconnect…" : "Poor connection. Others may hear you break up."}
          </span>
        )}
        {status === "live" && left < 10 * 60_000 && <span className="mt-2 rounded-full bg-[#ff9500]/20 px-3 py-0.5 text-[12px] font-medium text-[#ffb340]">Call ends in {hms(left)} (3-hour limit)</span>}
        {error && <span role="alert" className="mt-1 text-[13px] text-[#ff6961]">{error}</span>}
      </div>

      <div className={`grid min-h-0 flex-1 content-center justify-items-center gap-x-3 gap-y-7 overflow-y-auto px-[max(1rem,env(safe-area-inset-left))] pb-3 [@media(max-height:560px)]:gap-y-3 ${peers.length <= 1 ? "grid-cols-1" : peers.length <= 4 ? "grid-cols-2" : "grid-cols-[repeat(auto-fill,minmax(96px,1fr))]"}`}>
        {peers.map((p) => <Tile key={p.userId} peer={p} connected={!!audio[p.userId]} speaking={speaking.has(p.userId)} size={peers.length === 1 ? (short ? 80 : 128) : short ? 56 : 76} />)}
        {!peers.length && (
          <span className={status === "ended" ? "" : "animate-pulse"}><Avatar id={active.call.groupId ?? active.call.callerId} name={active.title} size={short ? 80 : 128} group={!!active.call.groupId} /></span>
        )}
      </div>

      <p aria-live="polite" className={`m-0 shrink-0 text-center text-[13px] ${muted ? "text-[#ffb340]" : "text-white/50"}`}>
        {muted ? "You are muted" : speaking.has("me") ? "You are speaking" : " "}
      </p>
      <footer className="flex shrink-0 items-start justify-center gap-7 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 [@media(max-height:560px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] [@media(max-height:560px)]:pt-2">
        <Control label={muted ? "Unmute" : "Mute"} on={muted} onClick={toggleMute}><MicIcon off={muted} /></Control>
        <Control label="End" danger onClick={() => hangUp()}><HangUp /></Control>
        <Control label="Minimise" on={false} onClick={() => setMini(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 10h6M14 10V4M14 10l7-7M10 14H4M10 14v6M10 14l-7 7" /></svg>
        </Control>
      </footer>
      <span className="sr-only" aria-live="polite">{sub}</span>
    </div>
    </>
  );
}

/** The floating player: tap to open the call, drag to move it to another corner (remembered on this device). */
function MiniPlayer({ label, onExpand, actions, children }: { label: string; onExpand: () => void; actions: React.ReactNode; children: React.ReactNode }) {
  const [corner, setCorner] = useState<Corner>(() => {
    try { const c = localStorage.getItem(CORNER_KEY); return c && c in CORNERS ? (c as Corner) : "tr"; } catch { return "tr"; }
  });
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  return (
    <div ref={box} role="region" aria-label={label}
      className={`fixed z-[75] w-max max-w-[calc(100vw-1.5rem)] sm:w-[330px] touch-none select-none ${CORNERS[corner]} ${offset ? "" : "transition-transform duration-200"}`}
      style={{ transform: offset ? `translate(${offset.x}px, ${offset.y}px) scale(1.03)` : undefined, animation: "tt-sheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)" }}
      onPointerDown={(e) => { if (e.button === 0) drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const x = e.clientX - d.x, y = e.clientY - d.y;
        if (!d.moved && Math.hypot(x, y) < 6) return;
        if (!d.moved) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); }
        setOffset({ x, y });
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (!d?.moved) return;
        const r = box.current?.getBoundingClientRect();
        if (r) {
          const next = `${r.top + r.height / 2 < innerHeight / 2 ? "t" : "b"}${r.left + r.width / 2 < innerWidth / 2 ? "l" : "r"}` as Corner;
          setCorner(next);
          try { localStorage.setItem(CORNER_KEY, next); } catch {}
        }
        setOffset(null);
      }}
      onPointerCancel={() => { drag.current = null; setOffset(null); }}>
      <div className="flex items-center gap-2.5 rounded-[24px] bg-[#1c1c1e]/95 p-2 pl-2.5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35)] ring-[0.5px] ring-white/15 backdrop-blur-xl">
        <button type="button" onClick={onExpand} aria-label="Open call" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-white">
          {children}
        </button>
        {actions}
      </div>
    </div>
  );
}

/** Four bars, like a phone's: green when good, amber when fair, red when poor, empty when lost. */
function Signal({ quality, size }: { quality: Quality; size: number }) {
  const n = BARS[quality];
  const colour = n >= 3 ? "#34c759" : n === 2 ? "#ffcc00" : "#ff453a";
  return (
    <svg width={size * 1.3} height={size} viewBox="0 0 13 10" aria-label={QUALITY_TEXT[quality]} role="img" className="shrink-0">
      {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 3.4} y={7.5 - i * 2.5} width="2.4" height={2.5 + i * 2.5} rx="0.8" fill={i < n ? colour : "rgba(255,255,255,0.25)"} />)}
    </svg>
  );
}

/** Someone's audio. Kept mounted in both views so the call is heard while minimised. */
function PeerAudio({ track }: { track?: MediaStreamTrack }) {
  const el = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (el.current) el.current.srcObject = track ? new MediaStream([track]) : null; }, [track]);
  return <audio ref={el} autoPlay />;
}

/** One person: their picture, ringed in green while they speak, and their name. */
function Tile({ peer, connected, speaking, size }: { peer: CallPeer; connected: boolean; speaking: boolean; size: number }) {
  return (
    <div className="flex min-w-0 max-w-full flex-col items-center gap-2.5">
      <span className={`rounded-full transition-shadow duration-150 ${speaking ? "shadow-[0_0_0_4px_#34c759,0_0_24px_6px_rgba(52,199,89,0.35)]" : "shadow-[0_0_0_4px_transparent]"}`}>
        <Avatar id={peer.userId} name={peer.name} src={peer.avatar} size={size} />
      </span>
      <span className="max-w-full truncate text-[15px] font-medium">{peer.name}</span>
      {!connected && <span className="-mt-1.5 text-[12px] text-white/50">Connecting…</span>}
    </div>
  );
}

function Control({ label, on, danger, onClick, children }: { label: string; on?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span className="flex w-16 flex-col items-center gap-1.5">
      <button type="button" onClick={onClick} aria-label={label} aria-pressed={danger ? undefined : on} title={label}
        className={`grid size-16 place-items-center rounded-full border-0 active:opacity-70 [@media(max-height:560px)]:size-12 ${danger ? "bg-[#ff3b30] text-white" : on ? "bg-white text-black" : "bg-white/15 text-white"}`}>{children}</button>
      <span aria-hidden className="text-[12px] text-white/70">{label}</span>
    </span>
  );
}

function MiniButton({ label, on, danger, onClick, children }: { label: string; on?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={danger ? undefined : on} title={label}
      className={`grid size-11 shrink-0 place-items-center sm:size-10 rounded-full border-0 active:opacity-70 ${danger ? "bg-[#ff3b30] text-white" : on ? "bg-white text-black" : "bg-white/15 text-white"}`}>{children}</button>
  );
}

const HangUp = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1a1 1 0 0 1-.56.9 11.5 11.5 0 0 0-2.66 1.85 1 1 0 0 1-1.4-.02L.29 13.1a1 1 0 0 1 0-1.41C3.34 8.79 7.46 7 12 7s8.66 1.79 11.71 4.69a1 1 0 0 1 0 1.41l-2.49 2.48a1 1 0 0 1-1.4.02 11.3 11.3 0 0 0-2.67-1.85 1 1 0 0 1-.56-.9v-3.1A15 15 0 0 0 12 9z" /></svg>
);
const MicIcon = ({ off, size = 24 }: { off?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />{off && <path d="M4 4l16 16" />}</svg>
);
const Handset = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
);
