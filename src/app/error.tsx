"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center gap-4 px-[22px] text-center">
      <h1 className="m-0 text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.03em]">Something went wrong.</h1>
      <p role="alert" className="m-0 text-pretty text-[17px] text-muted">Please try again. If it keeps happening, email notifiedlaw@gmail.com.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="h-11 rounded-full border-0 bg-blue px-5 text-[15px] font-medium text-white">Try again</button>
        <Link href="/" className="flex h-11 items-center rounded-full bg-fill px-5 text-[15px] font-medium text-ink! no-underline">Go home</Link>
      </div>
    </main>
  );
}
