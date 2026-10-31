"use client";

// Sound and measurement for voice calls: ring tones made with Web Audio (no files to load), who is speaking, and how
// good the connection is from WebRTC's own statistics.

import { useEffect, useState } from "react";

let shared: AudioContext | null = null;
/** One AudioContext for the app. Browsers start it suspended until the page has had a tap; resume is then allowed. */
export function audioCtx() {
  try {
    shared ??= new AudioContext();
    if (shared.state === "suspended") void shared.resume().catch(() => {});
    return shared;
  } catch {
    return null;
  }
}

type Note = { f: number; at: number; len: number };
const TONES: Record<"ringback" | "incoming", { every: number; volume: number; notes: Note[] }> = {
  // The UK ringing tone: 400 + 450 Hz, on 0.4 s, off 0.2 s, on 0.4 s, off 2 s.
  ringback: { every: 3, volume: 0.05, notes: [0, 0.6].flatMap((at) => [400, 450].map((f) => ({ f, at, len: 0.4 }))) },
  // A soft four-note chime, every two seconds.
  incoming: { every: 2, volume: 0.1, notes: [784, 988, 784, 988].map((f, i) => ({ f, at: i * 0.16, len: 0.14 })) },
};

/** Plays a repeating tone until the returned function is called. Silent where the browser has not allowed sound yet. */
export function playTone(kind: keyof typeof TONES): () => void {
  const ac = audioCtx();
  if (!ac) return () => {};
  const { every, volume, notes } = TONES[kind];
  const out = ac.createGain();
  out.gain.value = volume;
  out.connect(ac.destination);
  const cycle = () => {
    const t = ac.currentTime + 0.05;
    for (const n of notes) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = n.f;
      g.gain.setValueAtTime(0, t + n.at);
      g.gain.linearRampToValueAtTime(1, t + n.at + 0.02);
      g.gain.setValueAtTime(1, t + n.at + n.len - 0.03);
      g.gain.linearRampToValueAtTime(0, t + n.at + n.len);
      o.connect(g).connect(out);
      o.start(t + n.at);
      o.stop(t + n.at + n.len + 0.02);
    }
  };
  cycle();
  const timer = setInterval(cycle, every * 1000);
  return () => { clearInterval(timer); out.disconnect(); };
}

/** Level above which someone counts as speaking, and how many checks (of 120 ms) the ring stays on after. */
const SPEAKING_RMS = 0.03;
const HOLD = 4;

/** Who is speaking now, by key, from each track's loudness. A muted microphone sends silence, so it never lights. */
export function useSpeaking(tracks: [string, MediaStreamTrack][]) {
  const [speaking, setSpeaking] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const ac = audioCtx();
    if (!ac || !tracks.length) return;
    const meters = tracks.map(([key, track]) => {
      const source = ac.createMediaStreamSource(new MediaStream([track]));
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      return { key, source, analyser, buf: new Uint8Array(analyser.fftSize), hold: 0 };
    });
    const timer = setInterval(() => {
      const next = new Set<string>();
      for (const m of meters) {
        m.analyser.getByteTimeDomainData(m.buf);
        let sum = 0;
        for (const v of m.buf) sum += ((v - 128) / 128) ** 2;
        m.hold = Math.sqrt(sum / m.buf.length) > SPEAKING_RMS ? HOLD : Math.max(0, m.hold - 1);
        if (m.hold) next.add(m.key);
      }
      setSpeaking((prev) => (prev.size === next.size && [...next].every((k) => prev.has(k)) ? prev : next));
    }, 120);
    return () => { clearInterval(timer); meters.forEach((m) => m.source.disconnect()); };
  }, [tracks]);
  return speaking;
}

export type Quality = "good" | "fair" | "poor" | "lost";
export type Net = { quality: Quality; rtt: number | null; loss: number };
type Totals = { lost: number; received: number };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Reads the connection's statistics: round-trip time, packet loss since the last reading (`prev` is updated) and jitter,
 * graded the way a phone grades its bars.
 */
export async function measure(pc: RTCPeerConnection, prev: Totals): Promise<Net | null> {
  const report = await pc.getStats().catch(() => null);
  if (!report) return null;
  let rtt: number | null = null, lost = 0, received = 0, jitter = 0, upLoss = 0;
  report.forEach((r: Record<string, unknown>) => {
    if (r.type === "candidate-pair" && r.nominated && r.state === "succeeded") rtt = num(r.currentRoundTripTime) ?? rtt;
    else if (r.type === "inbound-rtp" && r.kind === "audio") {
      lost += num(r.packetsLost) ?? 0;
      received += num(r.packetsReceived) ?? 0;
      jitter = Math.max(jitter, num(r.jitter) ?? 0);
    } else if (r.type === "remote-inbound-rtp" && r.kind === "audio") upLoss = Math.max(upLoss, num(r.fractionLost) ?? 0);
  });
  const dLost = Math.max(0, lost - prev.lost), dReceived = Math.max(0, received - prev.received);
  prev.lost = lost;
  prev.received = received;
  const loss = Math.max(dLost + dReceived ? dLost / (dLost + dReceived) : 0, upLoss);
  const ms = rtt === null ? null : Math.round(rtt * 1000);
  const quality: Quality = loss > 0.1 || (ms ?? 0) > 700 ? "poor" : loss > 0.03 || (ms ?? 0) > 350 || jitter > 0.06 ? "fair" : "good";
  return { quality, rtt: ms, loss };
}

const RANK: Record<Quality, number> = { lost: 0, poor: 1, fair: 2, good: 3 };
/** The better of two readings, so one bad second does not flash a warning. */
export const better = (a: Quality, b: Quality) => (RANK[a] >= RANK[b] ? a : b);
export const BARS: Record<Quality, number> = RANK;
