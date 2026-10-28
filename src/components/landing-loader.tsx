"use client";

import { useEffect, useState } from "react";

const MIN_MS = 900; // a loader that flashes for a frame reads as a glitch, so it always shows this long
const MAX_MS = 12000; // on a stalled network, show the page anyway rather than spin forever
const FADE_MS = 500;

/**
 * Covers the landing page until every image, the fonts and the voice-over have downloaded.
 * The voice-over is fetched whole and handed back as a blob URL, so unmuting never waits on the network.
 */
export function LandingLoader({ images, audio, onReady }: { images: string[]; audio: string; onReady: (audioUrl: string | null) => void }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    let handed = false;
    const total = images.length + 2;
    let loaded = 0;
    const tick = <T,>(p: Promise<T>) => p.finally(() => { if (!cancelled) setProgress(++loaded / total); });

    const imgs = images.map((src) => {
      const img = new Image();
      img.src = src;
      return tick(img.decode().catch(() => {}));
    });
    const fonts = tick(document.fonts.ready.catch(() => {}));
    const voice = tick(
      fetch(audio)
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((b) => (blobUrl = URL.createObjectURL(b)))
        .catch(() => null),
    );

    const assets = Promise.all([...imgs, fonts, voice]);
    const minWait = new Promise((r) => setTimeout(r, MIN_MS));
    const maxWait = new Promise((r) => setTimeout(r, MAX_MS));
    void Promise.race([Promise.all([assets, minWait]), maxWait]).then(() => {
      if (cancelled) return;
      setProgress(1);
      handed = true;
      setDone(true);
      onReady(blobUrl);
    });

    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.documentElement.style.overflow = "";
      // A run cut short (e.g. Strict Mode remount) never hands its blob over, so free it here.
      void voice.then((u) => { if (u && !handed) URL.revokeObjectURL(u); });
    };
    // Runs once: the asset list is static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!done) return;
    document.documentElement.style.overflow = "";
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;
  return (
    <div
      id="nl-loader"
      role="progressbar"
      aria-label="Loading NotifiedLaw"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white transition-opacity ease-out ${done ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${FADE_MS}ms`, colorScheme: "light" }}
    >
      {/* Without JavaScript nothing would ever lift the overlay. */}
      <noscript><style>{"#nl-loader{display:none}"}</style></noscript>
      <div className="text-[28px] tracking-[-0.01em] text-[#1D1D1F]"><b>Notified</b><span className="text-[#FF9500]">Law</span></div>
      <div className="h-[3px] w-40 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[#1D1D1F] transition-[width] duration-300 ease-out" style={{ width: `${Math.max(6, progress * 100)}%` }} />
      </div>
    </div>
  );
}
