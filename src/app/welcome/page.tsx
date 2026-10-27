import Link from "next/link";

export const metadata = { title: "Sign in" };

export default function Welcome() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink-dark text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://commons.wikimedia.org/wiki/Special:FilePath/Balme_Library_at_University_of_Ghana_-_Legon.jpg?width=1600)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(28,28,30,0.2) 0%, rgba(28,28,30,0.75) 45%, rgba(28,28,30,0.97) 100%)",
        }}
      />
      <div className="flex-1" />
      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-3.5 px-6 pb-10">
        <div className="text-[15px] font-semibold">
          Notified<span className="font-normal text-amber-soft">Law</span>
        </div>
        <h1 className="text-balance text-[40px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
          The Law at Your Fingertips.
        </h1>
        <p className="text-[15px] leading-snug text-white/75">
          Notes, podcasts and exam prep for every law course, Level 100 to 300.
        </p>
        <div className="mt-2 flex flex-col gap-2.5">
          <Link
            href="/onboarding"
            className="flex h-12 items-center justify-center rounded-xl bg-white text-[16px] font-semibold"
            style={{ color: "#1d1d1f", textDecoration: "none" }}
          >
            Continue with Google
          </Link>
          <Link
            href="/onboarding"
            className="flex h-12 items-center justify-center rounded-xl bg-white/15 text-[16px] font-medium"
            style={{ color: "#fff", textDecoration: "none" }}
          >
            Continue with email
          </Link>
        </div>
      </div>
    </div>
  );
}
