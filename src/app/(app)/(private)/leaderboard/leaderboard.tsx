"use client";

import { Icon } from "@/components/icons";
import { usePlan, useStudyLevel } from "@/components/plan";
import { Btn, Gate, Initials, LevelSelect } from "@/components/ui";
import { LB_NAMES } from "@/lib/content";
import { LEVEL_LABEL, type Level } from "@/lib/data";

const COLORS = ["#FF9500", "#34C759", "#AF52DE", "#30B0C7", "#FF3B30", "#5856D6", "#A2845E", "#007AFF"];
const OFFSET: Record<Level, number> = { "100": 7, "200": 0, "300": 11, "400": 4, "pre-bar": 9, bar: 2 };
const TITLES: Record<Level, string> = { "400": "Company law, jurisprudence & conflict of laws", "pre-bar": "Procedure, skills & ethics", bar: "Litigation, conveyancing & practice", "100": "Sources of law & the court hierarchy", "200": "Judicial review, torts & mens rea", "300": "Land titles, trusts & natural justice" };
const COUNTS: Record<Level, number> = { "100": 214, "200": 186, "300": 152, "400": 121, "pre-bar": 96, bar: 78 };
const MEDALS = ["#FF9F0A", "#8E8E93", "#A2845E"];

export function Leaderboard() {
  const { pro, profile } = usePlan();
  const [level, setLevel] = useStudyLevel();
  const off = OFFSET[level];
  const people = Array.from({ length: 10 }, (_, i) => {
    const sec = 222 + i * 19 + ((off * 7) % 23);
    return {
      rank: i + 1,
      name: LB_NAMES[(i + off) % LB_NAMES.length],
      color: COLORS[(i + off) % COLORS.length],
      score: `${10 - Math.floor((i + (level === "300" ? 1 : 0)) / 3)}/10`,
      time: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`,
    };
  });
  const mine = level === (profile?.level ?? "200");
  const podium = [1, 0, 2].map((i) => ({ ...people[i], medal: MEDALS[i], big: i === 0 }));

  return (
    <div className="relative min-h-full">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-5 pb-12 pt-8 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-amber">Week 44 · 26 Oct – 1 Nov</div>
            <h1 className="text-[30px] font-bold tracking-[-0.02em]">Weekly Quiz Leaderboard</h1>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted"><Icon name="lock" size={12} />University of Ghana law students only</div>
          </div>
          <LevelSelect value={level} onChange={setLevel} />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-center gap-2 rounded-2xl bg-surface px-3 pt-6 shadow-card sm:gap-3 sm:px-4">
              {podium.map((p) => (
                <div key={p.rank} className="flex min-w-0 max-w-28 flex-1 flex-col items-center gap-1 rounded-t-xl bg-canvas px-2 pb-4 pt-4" style={{ height: p.big ? 214 : 190 }}>
                  <div className="relative">
                    <Initials name={p.name} color={p.color} size={p.big ? 68 : 56} />
                    <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-surface text-xs font-bold text-white" style={{ background: p.medal }}>{p.rank}</span>
                  </div>
                  <div className="mt-2 text-center text-[13px] font-semibold leading-tight">{p.name}</div>
                  <div className="text-sm font-bold">{p.score}</div>
                  <div className="text-xs tabular-nums text-muted">{p.time}</div>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
              <div className="grid grid-cols-[48px_1fr_64px_64px] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-faint"><span>Rank</span><span>Student</span><span>Score</span><span>Time</span></div>
              {people.slice(3).map((r) => (
                <div key={r.rank} className="grid grid-cols-[48px_1fr_64px_64px] items-center border-t border-edge/[0.06] px-4 py-2.5 text-[13px]">
                  <span className="tabular-nums text-muted">{r.rank}</span>
                  <span className="flex items-center gap-2.5"><Initials name={r.name} color={r.color} size={26} />{r.name}</span>
                  <span className="font-semibold">{r.score}</span><span className="tabular-nums text-muted">{r.time}</span>
                </div>
              ))}
              {mine && (
                <>
                  <div className="border-t border-edge/[0.06] py-1 text-center text-muted">···</div>
                  <div className="grid grid-cols-[48px_1fr_64px_64px] items-center bg-blue/[0.06] px-4 py-2.5 text-[13px] font-semibold">
                    <span>14</span>
                    <span className="flex items-center gap-2.5"><Initials name="Ama Owusu" color="#007AFF" size={26} />Ama Owusu <span className="font-normal text-muted">· You</span></span>
                    <span>7/10</span><span className="tabular-nums">6:48</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-5 shadow-card">
              <div className="text-xs font-semibold text-muted">This week’s quiz</div>
              <div className="text-xl font-bold leading-tight">{TITLES[level]}</div>
              <p className="text-[13px] leading-normal text-muted">10 questions drawn from every {LEVEL_LABEL[level]} course. Highest score wins; faster time breaks a tie.</p>
              <div className="grid grid-cols-2 gap-3 py-1 text-[13px]">
                <div><div className="text-xs text-muted">Closes in</div><div className="font-semibold">5d 7h</div></div>
                <div><div className="text-xs text-muted">Taking part</div><div className="font-semibold">{COUNTS[level]}</div></div>
              </div>
              <Btn href={mine ? "/exam-prep" : undefined} disabled={!mine}>{mine ? "Retake this week’s quiz" : "Quizzes are for your own level"}</Btn>
            </div>
            {mine && (
              <div className="flex flex-col gap-1 rounded-2xl bg-surface p-5 shadow-card">
                <div className="text-xs font-semibold text-muted">Your standing</div>
                <div><span className="text-[34px] font-bold">#14</span> <span className="text-sm text-muted">of {COUNTS[level]}</span></div>
                <p className="text-[13px] text-muted">One more correct answer moves you into the top 10. You have 1 retake left this week.</p>
              </div>
            )}
            <p className="px-1 text-xs leading-normal text-muted">A new quiz opens every Monday at 06:00 for every level, Pre-Bar and the Bar Course. Rankings show students at your university only.</p>
          </div>
        </div>
      </div>
      {!pro && <Gate title="Leaderboards come with Senior Judicial (Pro)" body="Take the weekly quiz for your level and see how you rank against law students at University of Ghana." cta="See plans" color="#FF9500" />}
    </div>
  );
}
