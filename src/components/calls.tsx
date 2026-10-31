"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CallInfo, CallPeer } from "@/lib/friend-view";
import { Avatar } from "./avatar";
import { Sheet } from "./sheet";

/** How often the app checks for calls ringing for the user, while visible and not in a call. */
const RING_POLL_MS = 5_000;
/** How often the call screen refreshes who is in the call (this also keeps the user present). */
const CALL_POLL_MS = 3_000;

type Active = { call: CallInfo; title: string; stream: MediaStream };
type Ctx = {
  /** Starts (or joins the open) voice call with a friend or a group. `title` names it on the call screen. */
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
    setError("");
    void withMic((stream) => {
      post<{ call: CallInfo }>("/api/calls", target)
        .then(({ call }) => setActive({ call, title, stream }))
        .catch((e: Error) => { stream.getTracks().forEach((t) => t.stop()); flash(e.message); });
    });
  }, [withMic, flash]);

  const incoming = active ? null : ringing.find((c) => !dismissed.has(c.id)) ?? null;
  const dismiss = (c: CallInfo) => {
    setDismissed((s) => new Set(s).add(c.id));
    if (!c.groupId) void post(`/api/calls/${c.id}/decline`).catch(() => {});
  };
  const pickUp = (c: CallInfo) => {
    setDismissed((s) => new Set(s).add(c.id));
    void withMic((stream) => setActive({ call: c, title: c.groupName ?? c.callerName, stream }), c.groupId ? undefined : () => dismiss(c));
  };

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
      {active && <CallScreen active={active} onClose={() => setActive(null)} />}
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

/**
 * The call itself: one RTCPeerConnection to Cloudflare's SFU. The microphone, already allowed, is published once; other
 * people's audio is pulled as they appear in the polled call state. SDP exchanges run one at a time.
 */
function CallScreen({ active, onClose }: { active: Active; onClose: () => void }) {
  const callId = active.call.id;
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [audio, setAudio] = useState<Record<string, MediaStreamTrack>>({});
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<"connecting" | "live" | "ended">("connecting");
  const [ended, setEnded] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState(active.call.endsAt);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream>(active.stream);
  const pulled = useRef(new Set<string>());
  const byMid = useRef(new Map<string, string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const closed = useRef(false);

  const serial = useCallback(<T,>(job: () => Promise<T>) => {
    const next = queue.current.then(job, job);
    queue.current = next.catch(() => {});
    return next;
  }, []);

  const hangUp = useCallback((reason?: string) => {
    if (closed.current) return;
    closed.current = true;
    local.current.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    void post(`/api/calls/${callId}/leave`).catch(() => {});
    setStatus("ended");
    setEnded(reason ?? "Call ended");
    setTimeout(onClose, 1400);
  }, [callId, onClose]);

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
        conn.onconnectionstatechange = () => { if (conn.connectionState === "failed") setError("The connection was lost. Check your internet."); };
        const sending = local.current.getAudioTracks().map((t) => conn.addTransceiver(t, { direction: "sendonly" }));
        await serial(async () => {
          await conn.setLocalDescription(await conn.createOffer());
          const res = await post<{ sdp: string }>(`/api/calls/${callId}/publish`, {
            sdp: conn.localDescription!.sdp, tracks: sending.map((tc) => ({ mid: tc.mid, name: "audio" })),
          });
          await conn.setRemoteDescription({ type: "answer", sdp: res.sdp });
        });
        setStatus("live");
        setJoinedAt(Date.now());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "The call could not connect.");
        hangUp("Could not connect");
      }
    })();
    return () => { cancelled = true; };
  }, [callId, hangUp, serial]);

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
        setAudio((a) => Object.fromEntries(Object.entries(a).filter(([id]) => d.peers.some((p) => p.userId === id))));
        const wants = d.peers.filter((p) => p.tracks.includes("audio") && !pulled.current.has(p.sessionId));
        if (!wants.length || !pc.current) return;
        wants.forEach((w) => pulled.current.add(w.sessionId));
        await serial(async () => {
          const conn = pc.current!;
          try {
            const res = await post<{ sdp: string | null; tracks: { mid: string; userId: string }[] }>(`/api/calls/${callId}/subscribe`, { tracks: wants.map((w) => ({ userId: w.userId, name: "audio" })) });
            res.tracks.forEach((t) => byMid.current.set(t.mid, t.userId));
            if (res.sdp) {
              await conn.setRemoteDescription({ type: "offer", sdp: res.sdp });
              await conn.setLocalDescription(await conn.createAnswer());
              await post(`/api/calls/${callId}/answer`, { sdp: conn.localDescription!.sdp });
            }
          } catch {
            wants.forEach((w) => pulled.current.delete(w.sessionId)); // try again on the next poll
          }
        });
      } catch {}
    };
    void poll();
    const t = setInterval(poll, CALL_POLL_MS);
    return () => clearInterval(t);
  }, [status, callId, hangUp, serial]);

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
  useEffect(() => () => { if (!closed.current) { closed.current = true; local.current.getTracks().forEach((t) => t.stop()); pc.current?.close(); void post(`/api/calls/${callId}/leave`).catch(() => {}); } }, [callId]);

  function toggleMute() {
    const t = local.current.getAudioTracks()[0];
    if (t) t.enabled = muted;
    setMuted(!muted);
  }

  const left = endsAt - now;
  const waiting = status === "live" && !peers.length;
  const sub = status === "ended" ? ended : status === "connecting" ? "Connecting…" : waiting ? (active.call.groupId ? "Waiting for others to join…" : "Ringing…") : joinedAt ? hms(now - joinedAt) : "";

  return (
    <div role="dialog" aria-modal="true" aria-label={`Call with ${active.title}`} className="fixed inset-0 z-[80] flex flex-col bg-[#0b0b0f] text-white">
      <header className="flex shrink-0 flex-col items-center gap-1 px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] text-center">
        <span className="max-w-full truncate text-[20px] font-semibold">{active.title}</span>
        <span className="text-[14px] tabular-nums text-white/70">{sub}</span>
        {status === "live" && left < 10 * 60_000 && <span className="rounded-full bg-[#ff9500]/20 px-3 py-0.5 text-[12px] font-medium text-[#ffb340]">Call ends in {hms(left)} (3-hour limit)</span>}
        {error && <span role="alert" className="mt-1 text-[13px] text-[#ff6961]">{error}</span>}
      </header>

      <div className={`grid min-h-0 flex-1 content-center gap-x-3 gap-y-6 overflow-y-auto px-4 pb-3 ${peers.length <= 1 ? "grid-cols-1" : peers.length <= 4 ? "grid-cols-2" : "grid-cols-[repeat(auto-fill,minmax(96px,1fr))]"}`}>
        {peers.map((p) => <Tile key={p.userId} peer={p} track={audio[p.userId]} big={peers.length === 1} />)}
        {!peers.length && (
          <div className="grid place-items-center">
            <span className="animate-pulse"><Avatar id={active.call.groupId ?? active.call.callerId} name={active.title} size={112} group={!!active.call.groupId} /></span>
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-center gap-8 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <Control label={muted ? "Unmute" : "Mute"} on={muted} onClick={toggleMute}><MicIcon off={muted} /></Control>
        <button type="button" onClick={() => hangUp()} aria-label="End call" className="grid size-16 place-items-center rounded-full border-0 bg-[#ff3b30] text-white active:opacity-70"><HangUp /></button>
      </footer>
      <span className="sr-only" aria-live="polite">{sub}</span>
    </div>
  );
}

/** One person: their picture and name, and their audio. */
function Tile({ peer, track, big }: { peer: CallPeer; track?: MediaStreamTrack; big: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (audio.current) audio.current.srcObject = track ? new MediaStream([track]) : null; }, [track]);
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <audio ref={audio} autoPlay />
      <Avatar id={peer.userId} name={peer.name} src={peer.avatar} size={big ? 128 : 72} />
      <span className="max-w-full truncate text-[14px] font-medium">{peer.name}</span>
      {!track && <span className="-mt-1 text-[12px] text-white/50">Connecting…</span>}
    </div>
  );
}

function Control({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={on} title={label}
      className={`grid size-14 place-items-center rounded-full border-0 active:opacity-70 ${on ? "bg-white text-black" : "bg-white/15 text-white"}`}>{children}</button>
  );
}

const HangUp = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1a1 1 0 0 1-.56.9 11.5 11.5 0 0 0-2.66 1.85 1 1 0 0 1-1.4-.02L.29 13.1a1 1 0 0 1 0-1.41C3.34 8.79 7.46 7 12 7s8.66 1.79 11.71 4.69a1 1 0 0 1 0 1.41l-2.49 2.48a1 1 0 0 1-1.4.02 11.3 11.3 0 0 0-2.67-1.85 1 1 0 0 1-.56-.9v-3.1A15 15 0 0 0 12 9z" /></svg>
);
const MicIcon = ({ off }: { off?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />{off && <path d="M4 4l16 16" />}</svg>
);
const Handset = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
);
