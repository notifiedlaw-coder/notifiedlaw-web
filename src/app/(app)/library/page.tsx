import Link from "next/link";
import { abbr, COURSES, LEVELS } from "@/lib/data";

export const metadata = { title: "Library" };

export default function Library() {
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-9 px-5 py-8 lg:px-10">
      {LEVELS.map((level) => (
        <section key={level} className="flex flex-col gap-3.5">
          <h2 className="text-xl font-bold">Level {level}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {COURSES[level].map((c) => (
              <Link
                key={c.slug}
                href={`/library/${c.slug}`}
                className="flex flex-col gap-3 rounded-[14px] bg-white p-[18px] shadow-card transition-shadow hover:shadow-card-hover"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="flex size-11 items-center justify-center rounded-xl text-[15px] font-bold text-white"
                  style={{ background: c.color }}
                >
                  {abbr(c.code)}
                </div>
                <div className="min-h-[38px] text-[15px] font-semibold leading-tight">
                  {c.title}
                </div>
                <div className="h-1 rounded-sm bg-track">
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${c.progress * 100}%`, background: c.color }}
                  />
                </div>
                <div className="text-xs text-muted">{c.code}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
