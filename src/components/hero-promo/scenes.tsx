import type { CSSProperties, ReactNode } from "react";

// The promo is drawn as live DOM, not video, so text and shapes stay sharp at any size.
// Two stages share one timeline: "wide" (16:9, desktop/tablet) and "tall" (2:3, phones).
export type Mode = "wide" | "tall";
export const STAGE: Record<Mode, { w: number; h: number }> = {
  wide: { w: 1600, h: 900 },
  tall: { w: 600, h: 900 },
};

// Scene lengths come from the voice-over: Library 7s, AI 5.7s, Podcast 4.5s, Plans 3.8s, Close 5.4s.
export const CUE = { Library: 0, AI: 7, Podcast: 12.7, Plans: 17.2, Close: 21 } as const;
export const DURATION = CUE.Close + 5.4;

const NL = {
  ink: "#1D1D1F", sub: "rgba(60,60,67,0.6)", bg: "#F5F5F7", fill: "#F2F2F7", track: "#E5E5EA",
  orange: "#FF9500", amber: "#FF9F0A", blue: "#007AFF", purple: "#BF5AF2",
  font: "var(--font-sans)",
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const outQuart = (t: number) => 1 - (1 - t) ** 4;
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Keyframes [[time, value], ...], eased per segment and clamped at both ends. */
function kf(T: number, keys: [number, number][], ease: (t: number) => number = inOutCubic) {
  if (T <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (T <= t1) return v0 + (v1 - v0) * ease((T - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}

type St = CSSProperties;
const row = (gap: number, extra: St = {}): St => ({ display: "flex", gap, ...extra });
const col = (gap: number, extra: St = {}): St => ({ display: "flex", flexDirection: "column", gap, ...extra });
const card: St = { background: "#FFF", borderRadius: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" };

function Logo({ size, dark }: { size: number; dark?: boolean }) {
  return <div style={{ fontSize: size, letterSpacing: "-0.01em", color: dark ? "#FFF" : NL.ink }}><b>Notified</b><span style={{ color: NL.orange }}>Law</span></div>;
}

const Eyebrow = ({ c, children, size = 12 }: { c: string; children: ReactNode; size?: number }) => (
  <div style={{ fontSize: size, fontWeight: 600, color: c, letterSpacing: "0.05em", textTransform: "uppercase" }}>{children}</div>
);

const NAV_GROUPS = [["Home", "Notified AI", "Hot Topics"], ["Study", "Library", "Flashcards", "Exam Prep", "Leaderboard"], ["Research", "Case Law", "Articles", "My Files"]];
function Sidebar({ active }: { active: string }) {
  const item = (n: string) => (
    <div key={n} style={{ height: 30, display: "flex", alignItems: "center", padding: "0 8px", borderRadius: 6, fontSize: 13, background: n === active ? NL.blue : "transparent", color: n === active ? "#FFF" : NL.ink }}>{n}</div>
  );
  return (
    <div style={{ width: 248, flexShrink: 0, background: "#F2F1F6", borderRight: "1px solid rgba(0,0,0,0.1)", ...col(0) }}>
      <div style={{ padding: "20px 20px 12px" }}><Logo size={17} /></div>
      <div style={{ margin: "0 12px 10px", height: 30, borderRadius: 7, background: "rgba(0,0,0,0.055)", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 13, color: NL.sub }}>Search cases, articles, topics</div>
      <div style={{ flex: 1, padding: "6px 10px", ...col(2) }}>
        {NAV_GROUPS[0].map(item)}
        {NAV_GROUPS.slice(1).map(([h, ...rest]) => [
          <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "rgba(60,60,67,0.55)", padding: "16px 8px 4px" }}>{h}</div>,
          ...rest.map(item),
        ])}
      </div>
      <div style={{ ...row(10, { alignItems: "center" }), padding: 12, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: NL.orange, color: "#FFF", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>AO</div>
        <div style={{ fontSize: 13, lineHeight: 1.25 }}><b>Ama Owusu</b><div style={{ fontSize: 11, color: NL.sub }}>UG Legon · Max</div></div>
      </div>
    </div>
  );
}

function Toolbar({ title, sub, c }: { title: string; sub: string; c: boolean }) {
  const pill: St = { height: c ? 26 : 24, padding: "0 10px", borderRadius: 13, background: NL.fill, fontSize: c ? 13 : 12, fontWeight: 600, display: "flex", alignItems: "center", whiteSpace: "nowrap" };
  return (
    <div style={{ height: c ? 56 : 52, flexShrink: 0, ...row(10, { alignItems: "center" }), padding: c ? "0 20px" : "0 20px", borderBottom: "1px solid rgba(0,0,0,0.1)", background: "#FFF" }}>
      <div style={{ lineHeight: 1.2 }}><div style={{ fontSize: c ? 17 : 15, fontWeight: 600 }}>{title}</div><div style={{ fontSize: c ? 12 : 11, color: NL.sub }}>{sub}</div></div>
      <div style={{ flex: 1 }} />
      <div style={pill}>✦ 500 credits</div>
      {!c && <div style={pill}>Supreme Justice (Max)</div>}
    </div>
  );
}

const rise = (p: number, i: number, dist = 24): St => {
  const v = clamp((p - i * 0.12) * 3, 0, 1);
  return { opacity: v, transform: `translateY(${(1 - v) * dist}px)` };
};

function Home({ p, c }: { p: number; c: boolean }) {
  const courses: [string, string, string, number][] = [["201", "Constitutional Law II", "#FF9500", 0.62], ["203", "Law of Torts I", "#30B0C7", 0.35], ["205", "Criminal Law I", "#FF3B30", 0.4], ["207", "Law of Contract II", "#AF52DE", 0.15]];
  return (
    <div style={{ padding: c ? "22px 24px" : "28px 40px", ...col(c ? 16 : 22) }}>
      <div style={rise(p, 0)}>
        <div style={{ fontSize: c ? 12 : 13, fontWeight: 600, color: NL.sub, letterSpacing: "0.04em" }}>MONDAY, 26 OCTOBER</div>
        <div style={{ fontSize: c ? 26 : 30, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>Akwaaba, Ama</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: c ? "1fr" : "1.6fr 1fr", gap: 20 }}>
        <div style={{ ...rise(p, 1), background: "#1C1C1E", color: "#FFF", borderRadius: 16, padding: c ? 20 : 26, ...col(c ? 10 : 14) }}>
          <Eyebrow c={NL.amber}>Continue reading</Eyebrow>
          <div>
            <div style={{ fontSize: c ? 20 : 24, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15 }}>Judicial Review &amp; the Supremacy of the Constitution</div>
            <div style={{ fontSize: c ? 13 : 14, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>Constitutional Law II · Topic 1 · 6 min left</div>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }}><div style={{ width: `${40 + p * 22}%`, height: "100%", borderRadius: 2, background: NL.amber }} /></div>
          <div style={row(10)}>
            <div style={{ height: 36, padding: "0 18px", borderRadius: 18, background: "#FFF", color: NL.ink, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center" }}>Resume</div>
            <div style={{ height: 36, padding: "0 16px", borderRadius: 18, background: "rgba(255,255,255,0.15)", fontSize: 14, display: "flex", alignItems: "center" }}>{c ? "Listen · 18 min" : "Listen as podcast · 18 min"}</div>
          </div>
        </div>
        {!c && (
          <div style={{ ...rise(p, 1.6), ...card, padding: 20, ...col(6) }}>
            <Eyebrow c="#AF52DE">Flashcards</Eyebrow>
            <div style={{ fontSize: 22, fontWeight: 700 }}>24 cards due today</div>
            <div style={{ fontSize: 13, color: NL.sub }}>Judicial Review · Negligence · Mens Rea</div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: NL.blue }}>Start review</div>
          </div>
        )}
      </div>
      <div style={{ fontSize: c ? 17 : 20, fontWeight: 700, ...rise(p, 2.2) }}>Your Level 200 courses</div>
      <div style={{ display: "grid", gridTemplateColumns: c ? "1fr 1fr" : "repeat(4, 1fr)", gap: c ? 12 : 14 }}>
        {courses.map(([code, n, color, v], i) => (
          <div key={code} style={{ ...rise(p, 2.5 + i * 0.4), ...card, borderRadius: 14, overflow: "hidden", padding: c ? "12px 14px" : "0 16px 16px", ...col(c ? 8 : 12) }}>
            {c ? (
              <div style={row(10, { alignItems: "center" })}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: color, color: "#FFF", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{code}</div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{n}</div>
              </div>
            ) : (
              <>
                <div style={{ margin: "0 -16px", height: 70, background: `linear-gradient(135deg, ${color}33, ${color}0d)` }} />
                <div style={{ marginTop: -34, width: 42, height: 42, borderRadius: 12, border: "3px solid #FFF", background: color, color: "#FFF", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{code}</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2, minHeight: 36 }}>{n}</div>
              </>
            )}
            <div style={{ height: 4, borderRadius: 2, background: NL.track }}><div style={{ width: `${v * 100}%`, height: "100%", borderRadius: 2, background: color }} /></div>
            <div style={{ fontSize: 12, color: NL.sub }}>5 topics · {Math.round(v * 100)}% complete</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chat({ p, c }: { p: number; c: boolean }) {
  const q = "Explain stare decisis simply.";
  const a = "Courts follow earlier decisions on the same point of law. In Ghana, the Supreme Court binds every lower court, but under Article 129(3) it may depart from its own past decisions.";
  const qn = Math.round(clamp(p * 3, 0, 1) * q.length);
  const an = Math.round(clamp((p - 0.4) * 2, 0, 1) * a.length);
  const fs = c ? 18 : 18;
  return (
    <div style={{ padding: c ? "26px 24px" : "36px 64px", ...col(18), height: "100%" }}>
      <Eyebrow c="#5856D6">Notified AI · 1 credit per message</Eyebrow>
      <div style={{ fontSize: c ? 14 : 15, color: NL.sub }}>Ask about any case, article or statute. Ghanaian law only.</div>
      <div style={{ alignSelf: "flex-end", background: NL.blue, color: "#FFF", padding: "12px 18px", borderRadius: "20px 20px 6px 20px", fontSize: fs, minHeight: 48, opacity: qn ? 1 : 0 }}>{q.slice(0, qn)}</div>
      <div style={{ alignSelf: "flex-start", maxWidth: c ? "100%" : 680, background: "#FFF", padding: "16px 20px", borderRadius: "20px 20px 20px 6px", fontSize: fs, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.06)", opacity: an ? 1 : 0 }}>{a.slice(0, an)}</div>
      <div style={{ ...row(8, { flexWrap: "wrap" }), opacity: clamp((p - 0.85) * 6, 0, 1) }}>
        {(c ? ["Quiz me on Tuffuor v A-G", "What is an allodial title?"] : ["Quiz me on Tuffuor v A-G", "Outline an answer on negligence", "What is an allodial title?"]).map((s) => (
          <span key={s} style={{ fontSize: 14, padding: "8px 14px", borderRadius: 999, background: "#FFF", border: "1px solid rgba(0,0,0,0.1)" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function Player({ prog }: { prog: number }) {
  const secs = Math.floor(prog * 1020);
  return (
    <div style={row(14, { alignItems: "center", marginTop: 2 })}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#1D1D1F"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
      </div>
      <div style={{ flex: 1, ...col(6) }}>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }}><div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 2, background: NL.amber }} /></div>
        <div style={{ ...row(0, { justifyContent: "space-between" }), fontSize: 12, color: "rgba(255,255,255,0.6)" }}><span>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span><span>17:00</span></div>
      </div>
      <div style={{ height: 28, width: 48, borderRadius: 14, background: "rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>1×</div>
    </div>
  );
}

function HotTopics({ p, c }: { p: number; c: boolean }) {
  const prog = 0.2 + clamp(p, 0, 1) * 0.18;
  const KC: Record<string, string> = { Case: "#007AFF", Article: "#FF9F0A", Topic: "#AF52DE" };
  const refs = [["Case", "Edusei v Attorney-General", "[1996–97] SCGLR 1 · Case brief"], ["Article", "Article 2 or Article 33? Choosing the right court", "Constitutional law · 6 min read"], ["Topic", "Judicial Review & the Supremacy of the Constitution", "Constitutional Law II · Topic 1"]];
  const talking = ["Why the label on the writ does not decide the forum", "High Court under Article 33(1), step by step", "When a rights claim becomes a genuine interpretation question"];
  return (
    <div style={{ padding: c ? "22px 24px" : "28px 40px", ...col(c ? 16 : 20) }}>
      <div style={rise(p, 0, 20)}>
        <div style={{ fontSize: c ? 24 : 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Hot Topics Podcast</div>
        <div style={{ fontSize: 14, color: NL.sub, marginTop: 2 }}>What Accra is talking about, and the law behind it.</div>
      </div>
      <div style={{ ...rise(p, 0.8, 20), background: "linear-gradient(90deg, rgba(28,28,30,0.97), rgba(28,28,30,0.85))", color: "#FFF", borderRadius: 16, padding: c ? 20 : 28, ...col(c ? 10 : 14) }}>
        <Eyebrow c={NL.amber}>Episode 4 · Fundamental rights</Eyebrow>
        <div style={{ fontSize: c ? 24 : 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Passport withheld? Where do you actually sue?</div>
        <div style={{ fontSize: c ? 14 : 15, color: "rgba(255,255,255,0.75)", maxWidth: 640, lineHeight: 1.4 }}>A viral thread asks whether you can take the state straight to the Supreme Court over a withheld passport. We walk through Edusei and the Article 2 vs Article 33 split.</div>
        <Player prog={prog} />
      </div>
      {c ? (
        <div style={{ ...rise(p, 1.8, 20), ...card, padding: 18, ...col(8) }}>
          <Eyebrow c={NL.sub}>In this episode</Eyebrow>
          {talking.slice(0, 2).map((x) => <div key={x} style={{ fontSize: 14, lineHeight: 1.35 }}>{x}</div>)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ ...rise(p, 1.8, 20), ...card, padding: 20, ...col(10) }}>
            <Eyebrow c={NL.sub}>In this episode</Eyebrow>
            {talking.map((x) => <div key={x} style={{ fontSize: 14, lineHeight: 1.35 }}>{x}</div>)}
          </div>
          <div style={{ ...rise(p, 2.4, 20), ...card, overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 8px" }}><Eyebrow c={NL.sub}>From our website</Eyebrow></div>
            {refs.map(([k, t, s]) => (
              <div key={t} style={{ ...row(12, { alignItems: "center" }), padding: "10px 20px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <span style={{ width: 56, flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: KC[k] }}>{k.toUpperCase()}</span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</div>
                  <div style={{ fontSize: 12, color: NL.sub }}>{s}</div>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type PlanData = { name: string; price: string; blurb: string; color: string; dark?: boolean; badge?: string; credits: string; perks: string[] };
const PLANS: PlanData[] = [
  { name: "Attorney", price: "Free", blurb: "Try NotifiedLaw with starter content.", color: "#1D1D1F", credits: "No Notify Credits", perks: ["First 2 topics of every course", "Starter flashcard decks"] },
  { name: "Senior Judicial", price: "GH₵45", blurb: "The full library, with AI to help it stick.", color: "#0071E3", credits: "150 Notify Credits / month", perks: ["All topics, at every level", "AI summaries for every note", "Unlimited AI flashcards"] },
  { name: "Supreme Justice", price: "GH₵85", blurb: "Everything, plus AI that listens, talks and tutors.", color: "#BF5AF2", dark: true, badge: "Most complete", credits: "500 Notify Credits / month", perks: ["AI podcast of any note", "Personal AI tutor", "Exam mode with expert marking"] },
];

function PlanCard({ d }: { d: PlanData }) {
  const { dark } = d;
  return (
    <div style={{ width: 340, height: 430, overflow: "hidden", background: dark ? "#1D1D1F" : NL.bg, color: dark ? NL.bg : NL.ink, borderRadius: 28, padding: 32, ...col(14), boxShadow: "0 30px 70px rgba(0,0,0,0.35)" }}>
      <div style={row(0, { justifyContent: "space-between", alignItems: "center" })}>
        <div style={{ fontSize: 21, fontWeight: 600, color: d.color }}>{d.name}</div>
        {d.badge && <div style={{ fontSize: 12, fontWeight: 600, color: NL.amber }}>{d.badge}</div>}
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>{d.price}<span style={{ fontSize: 15, fontWeight: 400, opacity: 0.6 }}>{d.price === "Free" ? "" : " / month"}</span></div>
      <div style={{ fontSize: 17, lineHeight: 1.35, color: dark ? "#A1A1A6" : "#6E6E73", minHeight: 46 }}>{d.blurb}</div>
      <div style={{ borderRadius: 8, padding: "8px 12px", background: dark ? "rgba(255,255,255,0.1)" : "#FFF", fontSize: 14, fontWeight: 600 }}>{d.credits}</div>
      {d.perks.map((k) => <div key={k} style={{ fontSize: 16 }}>{k}</div>)}
    </div>
  );
}

/** Phone-width plan: one horizontal card. */
function PlanRow({ d }: { d: PlanData }) {
  const { dark } = d;
  return (
    <div style={{ width: 540, height: 150, overflow: "hidden", background: dark ? "#1D1D1F" : NL.bg, color: dark ? NL.bg : NL.ink, borderRadius: 24, padding: "16px 20px", ...row(14), boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
      <div style={{ width: 180, flexShrink: 0, ...col(4) }}>
        <div style={{ fontSize: 19, fontWeight: 600, color: d.color }}>{d.name}</div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>{d.price}<span style={{ fontSize: 13, fontWeight: 400, opacity: 0.6 }}>{d.price === "Free" ? "" : " / month"}</span></div>
        {d.badge ? <div style={{ fontSize: 12, fontWeight: 600, color: NL.amber }}>{d.badge}</div> : <div style={{ fontSize: 13, color: "#6E6E73" }}>{d.credits}</div>}
      </div>
      <div style={{ flex: 1, ...col(6), justifyContent: "center" }}>
        {d.badge && <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>{d.credits}</div>}
        {d.perks.map((k) => <div key={k} style={{ fontSize: 14, lineHeight: 1.25 }}>{k}</div>)}
      </div>
    </div>
  );
}

export function Scene({ T, mode, captions = true }: { T: number; mode: Mode; captions?: boolean }) {
  const c = mode === "tall";
  const { Library: L, AI: A, Podcast: P, Plans: Pl, Close: Cl } = CUE;
  const End = Cl + 5.4;

  const winO = kf(T, [[L, 0], [L + 0.6, 1], [Pl - 0.2, 1], [Pl + 0.6, 0]]);
  const winS = kf(T, [[L, 0.92], [A, 0.93], [P, 0.94], [Pl, 0.94], [Pl + 1, 0.92]]);
  const chatO = kf(T, [[A + 0.1, 0], [A + 0.6, 1], [P - 0.1, 1], [P + 0.4, 0]]);
  const hotO = kf(T, [[P - 0.1, 0], [P + 0.4, 1]]);
  const nav = T < A + 0.3 ? "Home" : T < P + 0.15 ? "Notified AI" : "Hot Topics";
  const bar = ({ Home: ["Home", "Monday, 26 October"], "Notified AI": ["Notified AI", "Ghanaian law only"], "Hot Topics": ["Hot Topics Podcast", "Latest in Accra, with the law behind it"] } as Record<string, string[]>)[nav];

  const cIn = kf(T, [[Cl + 0.5, 0], [Cl + 1.5, 1]], outQuart);
  const cOut = kf(T, [[End - 0.7, 0], [End, 1]]);
  const labels: [number, number, string, string, string][] = [
    [L + 0.4, A - 0.2, "Library", "#FF9F0A", "Every course. Every topic."],
    [A + 0.4, P - 0.2, "Notified AI", "#BF5AF2", "A tutor that has read every note."],
    [P + 0.4, Pl - 0.2, "Hot Topics", "#FF375F", "The law behind the week."],
    [Pl + 0.4, Cl - 0.2, "Plans", "#30D158", "Three ways to study."],
  ];
  const cap = labels.find(([a, b]) => T >= a && T < b);
  const capO = cap ? Math.min(kf(T, [[cap[0], 0], [cap[0] + 0.7, 1]], outQuart), kf(T, [[cap[1] - 0.5, 1], [cap[1], 0]])) : 0;

  const win: St = c
    ? { left: 30, top: 176, width: 540, height: 640, marginLeft: 0, marginTop: 0 }
    : { left: "50%", top: "50%", width: 1280, height: 720, marginLeft: -640, marginTop: -360 };
  const winY = c ? 0 : 100;

  const planOut = (st: number) => Math.min(kf(T, [[st, 0], [st + 0.7, 1]]), 1 - kf(T, [[Cl - 0.1, 0], [Cl + 0.5, 1]]));
  const planY = (st: number, from: number) => kf(T, [[st, from], [st + 1, 0]], outQuart) + kf(T, [[Cl - 0.1, 0], [Cl + 0.5, -60]]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", textAlign: "left", fontFamily: NL.font, color: "#FFF", background: "#000" }}>
      <div style={{ position: "absolute", ...win, opacity: winO, transform: `translateY(${winY}px) scale(${c ? 1 : winS})`, borderRadius: 16, overflow: "hidden", background: NL.bg, color: NL.ink, display: "flex", boxShadow: "0 50px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12)" }}>
        {!c && <Sidebar active={nav} />}
        <div style={{ flex: 1, ...col(0), minWidth: 0 }}>
          <Toolbar title={bar[0]} sub={bar[1]} c={c} />
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, opacity: Math.max(0, 1 - chatO - hotO) }}><Home p={clamp((T - L - 0.2) / 3, 0, 1)} c={c} /></div>
            <div style={{ position: "absolute", inset: 0, opacity: chatO }}><Chat p={clamp((T - A - 0.6) / 3.6, 0, 1)} c={c} /></div>
            <div style={{ position: "absolute", inset: 0, opacity: hotO }}><HotTopics p={clamp((T - P - 0.3) / 3, 0, 1)} c={c} /></div>
          </div>
        </div>
      </div>

      {c ? (
        <div style={{ position: "absolute", left: 30, top: 176, ...col(14) }}>
          {PLANS.map((d, i) => {
            const st = Pl + 0.5 + i * 0.25;
            return <div key={d.name} style={{ opacity: planOut(st), transform: `translateY(${planY(st, 200)}px)` }}><PlanRow d={d} /></div>;
          })}
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", marginTop: -150, ...row(32, { justifyContent: "center", alignItems: "stretch" }) }}>
          {PLANS.map((d, i) => {
            const st = Pl + 0.5 + i * 0.25;
            return <div key={d.name} style={{ flex: "0 0 340px", opacity: planOut(st), transform: `translateY(${planY(st, 260)}px)` }}><PlanCard d={d} /></div>;
          })}
        </div>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, top: c ? 290 : 285, padding: c ? "0 28px" : 0, textAlign: "center", opacity: cIn * (1 - cOut), filter: `blur(${(1 - cIn) * 14}px)`, transform: `translateY(${(1 - cIn) * 16}px) scale(${1 + kf(T, [[Cl, 0], [End, 0.03]], (t) => t)})` }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Logo size={c ? 22 : 32} dark /></div>
        <div style={{ marginTop: c ? 18 : 24, fontSize: c ? 60 : 100, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, textWrap: "balance" }}>Your LLB starts here.</div>
        <div style={{ marginTop: c ? 30 : 40, display: "inline-flex", alignItems: "center", height: c ? 48 : 60, padding: c ? "0 24px" : "0 30px", borderRadius: 999, background: "#0071E3", color: "#FFF", fontSize: c ? 18 : 22, fontWeight: 500 }}>Start studying free</div>
        <div style={{ marginTop: c ? 22 : 28, fontSize: c ? 15 : 22, lineHeight: 1.4, color: "rgba(235,235,245,0.6)" }}>On Mac, iPhone, Android and the web{c ? <br /> : " · "}notifiedlaw.com</div>
      </div>

      {captions && (
        <div style={{ position: "absolute", left: 0, right: 0, top: c ? 34 : 50, padding: c ? "0 28px" : 0, textAlign: "center", opacity: capO, filter: `blur(${(1 - capO) * 10}px)`, transform: `translateY(${(1 - capO) * 16}px)` }}>
          <div style={{ fontSize: c ? 17 : 26, fontWeight: 600, letterSpacing: "-0.01em", color: cap ? cap[3] : "#FFF" }}>{cap ? cap[2] : ""}</div>
          <div style={{ marginTop: 6, fontSize: c ? 40 : 62, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.05, textWrap: "balance" }}>{cap ? cap[4] : ""}</div>
        </div>
      )}
    </div>
  );
}
