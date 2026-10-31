"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center gap-4 px-[22px] text-center">
      <h1 className="m-0 text-balance text-[44px] leading-[1.04]">Something went wrong.</h1>
      <p role="alert" className="m-0 text-pretty text-[17px] text-muted">Please try again. If it keeps happening, email notifiedlaw@gmail.com.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="h-[52px] rounded-full border-0 bg-blue px-6 text-[16px] font-semibold text-white hover:bg-blue-press">Try again</button>
        <Link href="/" className="flex h-[52px] items-center rounded-full border border-edge/15 bg-surface px-6 text-[16px] font-semibold text-ink! no-underline hover:bg-hover">Go home</Link>
      </div>
    </main>
  );
}
