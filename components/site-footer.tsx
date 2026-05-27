"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui";
import { ArrowUpRight, Mail, MessageSquareQuote, PhoneCall, Sparkles } from "lucide-react";

const quickLinks = [
  { href: "/game/setup", label: "Play now" },
  { href: "/game", label: "Fullscreen mode" },
  { href: "/pro", label: "Go Pro" },
  { href: "/leaderboard", label: "Leaderboard" }
] as const;

export function SiteFooter() {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/game") || pathname.startsWith("/room")) {
    return null;
  }

  return (
    <footer className="relative mt-12 overflow-hidden border-t border-[#dfe3d6] bg-[linear-gradient(180deg,#f6f2e8_0%,#eef4e8_100%)] text-[#1f2639]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,176,99,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(125,182,236,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(214,180,117,0.1),transparent_24%)]" />
      <Container className="relative py-8 sm:py-10 lg:py-12">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/60 shadow-[0_24px_70px_rgba(74,92,56,0.12)] backdrop-blur-md">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.85fr_0.9fr]">
            <div className="border-b border-[#dfe3d6] p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d7e0ca] bg-[#f3f8ec] shadow-[0_14px_32px_rgba(79,110,67,0.12)]">
                  <Sparkles className="h-6 w-6 text-[#8fd07c]" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-[#6e8460]">Backgammon Rush</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#1f2639]">Premium support, clean contact, fast feedback.</h2>
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[#66707c] sm:text-lg">
                For questions, feedback, partnership ideas, or launch support, reach out directly. This footer is built to feel like part of the product,
                not a placeholder.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="mailto:azhar208asko@gmail.com?subject=Backgammon%20Rush%20feedback"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#6fae57] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#5f9f4d]"
                >
                  <Mail className="h-4 w-4" />
                  Send feedback
                </a>
                <a
                  href="tel:+77051032460"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#d6dccf] bg-[#f5f8f0] px-5 py-3 text-sm font-semibold text-[#4f6542] transition hover:-translate-y-0.5 hover:border-[#bfd2b0] hover:bg-[#edf4e5]"
                >
                  <PhoneCall className="h-4 w-4 text-[#6fae57]" />
                  Call support
                </a>
              </div>
            </div>

            <div className="border-b border-[#dfe3d6] p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <p className="text-sm uppercase tracking-[0.28em] text-[#6e8460]">Contact</p>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm text-[#6a7280]">Email</p>
                  <a
                    href="mailto:azhar208asko@gmail.com"
                    className="mt-1 inline-flex items-center gap-2 text-lg font-medium text-[#1f2639] transition hover:text-[#5f9f4d]"
                  >
                    azhar208asko@gmail.com
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <div>
                  <p className="text-sm text-[#6a7280]">Phone</p>
                  <a href="tel:+77051032460" className="mt-1 inline-flex items-center gap-2 text-lg font-medium text-[#1f2639] transition hover:text-[#5f9f4d]">
                    +7 705 103 2460
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <div>
                  <p className="text-sm text-[#6a7280]">Response</p>
                  <p className="mt-1 text-lg font-medium text-[#1f2639]">Usually within one business day</p>
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <p className="text-sm uppercase tracking-[0.28em] text-[#6e8460]">Feedback</p>
              <div className="mt-5 rounded-[24px] border border-[#dfe3d6] bg-[#fbfaf4] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <MessageSquareQuote className="h-10 w-10 rounded-2xl bg-[#edf5e1] p-2 text-[#6fae57]" />
                <p className="mt-4 text-base leading-7 text-[#66707c]">
                  Share bugs, ideas, or match suggestions. If something feels off, send a note and we&apos;ll treat it like product feedback, not a formality.
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch
                    className="flex items-center justify-between rounded-2xl border border-[#dfe3d6] bg-white/70 px-4 py-3 text-sm font-medium text-[#1f2639] transition hover:border-[#bfd2b0] hover:bg-[#f6f9f0]"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="h-4 w-4 text-[#6fae57]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#dfe3d6] px-8 py-5 text-sm text-[#6a7280] sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <p>© 2026 Backgammon Rush. Crafted for polished play.</p>
            <p>Backgammon Rush · Support · Feedback · Contact</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
