import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fbf7ef_0%,#efe8d8_100%)] px-6 py-20 text-center">
      <div className="max-w-xl space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6b8c59]">Backgammon Rush</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#1f2639] md:text-6xl">This page drifted off the board.</h1>
        <p className="text-lg leading-7 text-[#66707c] md:text-xl">The page you&apos;re looking for is not available. Head back home or start a game setup.</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="rounded-2xl bg-[#6fae57] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#5f9f4d]">
            Go Home
          </Link>
          <Link
            href="/game/setup"
            className="rounded-2xl border border-[#cfc6b3] bg-white/80 px-6 py-3 text-base font-semibold text-[#4f6542] transition hover:bg-[#f4f7ee]"
          >
            Start Setup
          </Link>
        </div>
      </div>
    </main>
  );
}
