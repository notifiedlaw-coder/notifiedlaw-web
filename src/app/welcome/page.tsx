import Link from "next/link";

export const metadata = { title: "Sign in" };

const BULLETS = ["Notes for every Level", "Listen to any note as a podcast", "Revise with flashcards and a personal AI tutor"];
const btn = "flex h-11 items-center justify-center rounded-[10px] text-[15px] font-medium";

export default function Welcome() {
  return (
    <div className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <div className="relative flex min-h-[46dvh] flex-col justify-end overflow-hidden bg-ink-dark p-8 text-white md:min-h-dvh md:p-14">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(https://commons.wikimedia.org/wiki/Special:FilePath/Balme_Library_at_University_of_Ghana_-_Legon.jpg?width=1600)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(28,28,30,0.2) 0%, rgba(28,28,30,0.75) 45%, rgba(28,28,30,0.97) 100%)" }} />
        <div className="relative flex flex-col gap-4">
          <div className="text-[17px] font-semibold">Notified<span className="font-normal text-amber-soft">Law</span></div>
          <h1 className="text-balance text-[40px] font-bold leading-[1.02] tracking-[-0.045em] md:text-6xl">Ghanaian law, made learnable.</h1>
          <ul className="flex flex-col gap-2 text-[15px] text-white/80">
            {BULLETS.map((b) => <li key={b} className="flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-amber-soft" />{b}</li>)}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center bg-surface px-6 py-10">
        <div className="flex w-full max-w-[360px] flex-col gap-3">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Sign in to NotifiedLaw</h2>
          <p className="text-sm text-muted">Use your student email to get 7 days of Supreme Justice (Max) free.</p>
          <Link href="/onboarding" className={`${btn} mt-2 bg-strong`} style={{ color: "var(--strong-fg)", textDecoration: "none" }}>Continue with Apple</Link>
          <Link href="/onboarding" className={`${btn} bg-surface shadow-[0_0_0_0.5px_var(--hairline)]`} style={{ color: "var(--ink)", textDecoration: "none" }}>Continue with Google</Link>
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-edge/10" />or<span className="h-px flex-1 bg-edge/10" /></div>
          <label className="text-xs font-semibold text-muted" htmlFor="email">Student email</label>
          <input id="email" type="email" placeholder="you@st.ug.edu.gh" className="h-11 rounded-[10px] bg-fill px-3.5 text-[15px] outline-none" />
          <Link href="/onboarding" className={`${btn} bg-blue`} style={{ color: "#fff", textDecoration: "none" }}>Continue</Link>
          <p className="text-center text-xs text-muted">By continuing you agree to the Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
