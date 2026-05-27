import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Container } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf7ef_0%,#efe8d8_100%)]">
      <Container className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e0ca] bg-[#f3f8ec] px-4 py-2 text-sm font-medium text-[#5f8050]">
          <Sparkles className="h-4 w-4" />
          Backgammon Rush
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#1f2639] md:text-6xl">This page drifted off the board.</h1>
        <p className="max-w-2xl text-lg leading-7 text-[#66707c] md:text-xl">
          The page you&apos;re looking for is not available. Head back to the homepage or open a setup flow to start a match.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="rounded-2xl bg-[#6fae57] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#5f9f4d]">
            Go Home
          </Link>
          <Link href="/game/setup" className="rounded-2xl border border-[#cfc6b3] bg-white/80 px-6 py-3 text-base font-semibold text-[#4f6542] transition hover:bg-[#f4f7ee]">
            Start Setup
          </Link>
        </div>
      </Container>
    </div>
  );
}
