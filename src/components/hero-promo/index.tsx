"use client";

import { useEffect, useRef, useState } from "react";
import { DURATION, STAGE, Scene, type Mode } from "./scenes";

export const AUDIO_SRC = "/media/voiceover.mp3";
const AUDIO_END = 25.88; // length of the voice-over; the last half second is silent
const STILL = 4.2; // frame shown to people who prefer reduced motion: the Home screen, fully built

const btn = "flex size-9 items-center justify-center rounded-full border-0 bg-black/45 backdrop-blur-md hover:bg-black/60";

/**
 * The hero promo, drawn live from the app's own screens so it is sharp at any size.
 * Autoplays silently (browsers require it); the mute button turns the voice-over on.
 * It holds on the first frame until `ready`, so the landing loader can lift onto the opening shot.
 */
export function HeroPromo({ ready = true, audioSrc = AUDIO_SRC }: { ready?: boolean; audioSrc?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [time, setTime] = useState(0);
  const [wantPlay, setWantPlay] = useState(true);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [muted, setMuted] = useState(true);

  const playing = ready && wantPlay && inView && tabVisible;
  const mode: Mode = box.h > box.w ? "tall" : "wide";
  const stage = STAGE[mode];
  const scale = box.w / stage.w;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only preference, read once on mount
      setWantPlay(false);
      setTime(STILL);
    }
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // One clock drives the visuals and the voice-over.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const a = audioRef.current;
      // While the voice-over is audibly playing it is the clock, so the visuals follow it and it is never seeked.
      if (a && !a.paused && !a.muted && !a.ended && a.readyState >= 3) setTime(a.currentTime);
      else setTime((t) => { const n = t + dt; return n >= DURATION ? n - DURATION : n; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    // Muted, the voice-over stays paused; turned on, it seeks to the current frame. The landing loader has
    // usually fetched it already and passes it in as a blob URL.
    if (!playing || muted || time >= AUDIO_END) { if (!a.paused) a.pause(); return; }
    // Only seek when starting or after a loop/jump; small drift is absorbed by the clock following the audio.
    if (a.paused) {
      if (Math.abs(a.currentTime - time) > 0.3) a.currentTime = time;
      void a.play().catch(() => {});
    } else if (Math.abs(a.currentTime - time) > 1.5) a.currentTime = time;
  }, [time, playing, muted]);

  // Start sound inside the click itself: Safari only allows audible playback from a user gesture.
  const unmuteToggle = () => {
    const a = audioRef.current;
    if (muted && a && playing && time < AUDIO_END) {
      a.muted = false;
      a.currentTime = time;
      void a.play().catch(() => {});
    }
    setMuted(!muted);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div ref={boxRef} className="absolute inset-0" role="img" aria-label="NotifiedLaw product walkthrough: library, Notified AI, Hot Topics podcast and plans">
      {box.w > 0 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: stage.w, height: stage.h, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <Scene T={time} mode={mode} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/landing/hero-poster.webp" alt="" width={1600} height={900} className="size-full object-cover" />
      )}
      </div>
      <audio ref={audioRef} src={audioSrc} preload={audioSrc.startsWith("blob:") ? "auto" : "none"} muted={muted} />
      <div className="absolute bottom-3 right-3 flex gap-2 opacity-60 transition-opacity focus-within:opacity-100 hover:opacity-100">
        <button onClick={() => setWantPlay((v) => !v)} aria-label={wantPlay ? "Pause walkthrough" : "Play walkthrough"} className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            {wantPlay ? <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></> : <path d="M8 5v14l11-7z" />}
          </svg>
        </button>
        <button onClick={unmuteToggle} aria-label={muted ? "Unmute voice-over" : "Mute voice-over"} className={btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M4 9v6h4l5 4V5L8 9z" />
            {muted
              ? <path d="M16 9l5 6M21 9l-5 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
              : <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
