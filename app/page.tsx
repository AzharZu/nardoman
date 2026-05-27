"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Gamepad2, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui";
import { AuthMenu } from "@/components/auth-menu";
import { cn } from "@/lib/utils";

const topFeatures = [
  {
    icon: Sparkles,
    title: "Vibe Rooms",
    description: "Choose a mood first: soft grass, quiet dusk, or a clean board-lit room.",
    tone: "border-[#d7dfc8] bg-[#f4f8f1]"
  },
  {
    icon: Brain,
    title: "Coach",
    description: "Gentle, useful guidance that helps you improve without turning the game loud.",
    tone: "border-[#cbe0f1] bg-[#f0f7fd]"
  },
  {
    icon: Trophy,
    title: "Local Community",
    description: "Find calm, thoughtful matches across Almaty, Astana, Bishkek, and beyond.",
    tone: "border-[#eadab2] bg-[#faf6ec]"
  }
];

const boardRows = [
  ["#8c5b34", "#f3d6af", "#8c5b34", "#f3d6af", "#8c5b34", "#f3d6af"],
  ["#f3d6af", "#8c5b34", "#f3d6af", "#8c5b34", "#f3d6af", "#8c5b34"]
] as const;

const checkerMap = [
  { index: 0, tone: "bg-[#f4e7ce]" },
  { index: 4, tone: "bg-[#e6f1d8]" },
  { index: 8, tone: "bg-[#f4e7ce]" },
  { index: 13, tone: "bg-[#f4e7ce]" },
  { index: 20, tone: "bg-[#e6f1d8]" }
] as const;

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    void router.prefetch("/pro");
    void router.prefetch("/game/setup");
    void router.prefetch("/leaderboard");
    void router.prefetch("/dashboard");
  }, [router]);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Container className="flex h-[82px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-[#1f2639]">
            <Sparkles className="h-6 w-6 text-[#76b363]" />
            <span className="text-3xl font-semibold leading-none tracking-tight md:text-4xl">Backgammon Rush</span>
          </Link>
          <nav className="hidden items-center gap-9 text-xl font-medium text-[#2c3344] md:flex">
            <Link href="/#vibe-rooms" prefetch={false}>
              Vibe Rooms
            </Link>
            <Link href="/leaderboard" prefetch>
              Leaderboard
            </Link>
            <Link href="/pro" prefetch>
              Go Pro
            </Link>
            <Link href="/dashboard" prefetch className="brand-pill px-5 py-2 text-xl">
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <AuthMenu />
          </div>
        </Container>
      </header>

      <section className="relative overflow-hidden border-b border-[#dfe3d6] bg-[radial-gradient(circle_at_top_left,rgba(122,176,99,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(125,183,236,0.13),transparent_30%),linear-gradient(180deg,#f8f5ea_0%,#eef4e8_42%,#e4f1e1_100%)] py-16 lg:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/60 to-transparent" />
        <div className="pointer-events-none absolute left-[-4rem] top-24 h-64 w-64 rounded-full bg-[#99c67b]/18 blur-3xl" />
        <div className="pointer-events-none absolute right-[-3rem] top-48 h-72 w-72 rounded-full bg-[#7fb6ea]/14 blur-3xl" />

        <Container className="relative grid items-center gap-12 lg:grid-cols-[0.98fr_1.02fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl space-y-8"
          >
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-[#1f2639] md:text-7xl">
              Backgammon,
              <br />
              <span className="text-[#67a454]">in a softer light.</span>
            </h1>
            <p className="max-w-[760px] text-2xl leading-[1.25] text-[#5f6775] md:text-4xl lg:text-[42px]">
              A calm, anime-inspired place for smooth matches, gentle coaching, and cozy strategy.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/game/setup"
                prefetch
                className="inline-flex items-center gap-3 rounded-2xl bg-[#6fae57] px-7 py-4 text-lg font-semibold text-white shadow-[0_18px_40px_rgba(111,174,87,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#62a04e] hover:shadow-[0_22px_52px_rgba(111,174,87,0.32)]"
              >
                <Gamepad2 className="h-5 w-5" />
                Play Now
              </Link>
              <Link
                href="/game/setup?mode=friend"
                prefetch
                className="inline-flex items-center gap-3 rounded-2xl border border-[#97b78a] bg-[#f3f7ef] px-7 py-4 text-lg font-semibold text-[#60804f] shadow-[0_14px_32px_rgba(79,110,67,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-[#7fa46e] hover:bg-[#ebf2e4] hover:shadow-[0_18px_38px_rgba(79,110,67,0.12)]"
              >
                <Users className="h-5 w-5" />
                Create Friend Room
              </Link>
            </div>

            <Link
              href="/#vibe-rooms"
              className="inline-flex text-lg font-medium text-[#59704d] underline decoration-[#a8c293] decoration-2 underline-offset-4 transition hover:text-[#4e6341]"
            >
              Explore Vibe Rooms
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.08 }}
            className="relative"
          >
            <HeroScene />
          </motion.div>
        </Container>
      </section>

      <section id="vibe-rooms" className="bg-[#f6f7f6] py-16 lg:py-24">
        <Container className="space-y-10">
          <div className="text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-[#1f2639] md:text-5xl">Not just a game. A quiet little world.</h2>
            <p className="mt-3 text-xl text-[#868b95] md:text-2xl">Choose your mood, play your pace, and let the layout breathe.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {topFeatures.map((feature) => (
              <article key={feature.title} className={cn("rounded-3xl border p-8", feature.tone)}>
                <feature.icon className="h-10 w-10 rounded-2xl bg-white/80 p-2 text-[#76b363]" />
                <h3 className="mt-5 text-3xl font-semibold text-[#2a3041]">{feature.title}</h3>
                <p className="mt-3 text-xl leading-[1.35] text-[#656c79]">{feature.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="hero-green py-20 text-center text-white lg:py-24">
        <Container className="space-y-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Ready to experience backgammon
            <br />
            at a calmer pace?
          </h2>
          <p className="text-xl font-medium text-white/90 md:text-3xl">Open fullscreen, pick your vibe, and start playing</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/game" className="rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-[#74ac61] md:text-2xl">
              Enter Fullscreen Mode
            </Link>
            <Link href="/pro" className="rounded-2xl bg-[#efe5d5] px-8 py-4 text-lg font-semibold text-[#5f7f4d] md:text-2xl">
              Explore Vibe Rooms
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

function HeroScene() {
  return (
    <div className="relative mx-auto w-full max-w-[860px] px-2 pb-10 pt-3 sm:px-4 lg:max-w-none lg:px-0">
      <div className="pointer-events-none absolute inset-x-[14%] top-0 h-28 rounded-full bg-[#fff2cf]/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[-2%] h-40 rounded-full bg-[#183215]/30 blur-3xl" />

      <div className="relative overflow-visible">
        <div className="pointer-events-none absolute inset-x-[14%] bottom-[12%] z-0 h-28 rounded-full bg-black/28 blur-3xl" />
        <div className="relative isolate min-h-[580px] overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#304255_0%,#2a3c46_18%,#243930_36%,#1f2e1f_58%,#11170d_100%)] shadow-[0_38px_110px_rgba(33,45,24,0.26)] md:min-h-[760px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_24%,rgba(255,208,132,0.28)_0%,rgba(255,208,132,0.16)_14%,transparent_34%),radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.12)_0%,transparent_15%),radial-gradient(circle_at_74%_20%,rgba(255,255,255,0.1)_0%,transparent_16%)]" />
          <div className="absolute inset-x-0 top-[18%] h-52 bg-[radial-gradient(circle_at_center,rgba(255,217,143,0.18),transparent_72%)]" />
          <div className="absolute inset-x-[-4%] bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(56,90,41,0.2)_0%,rgba(27,43,22,0.7)_30%,rgba(14,21,11,0.98)_100%)]" />
          <div className="absolute inset-x-[-6%] bottom-[-4%] h-[28%] bg-[repeating-linear-gradient(74deg,rgba(108,164,89,0)_0_12px,rgba(108,164,89,0.12)_12px_17px)] blur-[0.35px] opacity-45" />
          <div className="absolute left-[8%] top-[18%] h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-[12%] top-[22%] h-64 w-64 rounded-full bg-[#f0d9a0]/12 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(180deg,transparent_0%,rgba(13,19,9,0.32)_26%,rgba(13,19,9,0.92)_100%)]" />

          <div className="absolute left-1/2 top-[29%] z-10 w-[98%] -translate-x-1/2 md:w-[94%]">
            <div className="absolute inset-x-[10%] top-[60%] h-32 rounded-full bg-black/42 blur-[76px]" />
            <div
              className="relative"
              style={{
                transform: "perspective(1600px) rotateX(16deg) rotateZ(-4deg) skewX(-4deg)",
                transformOrigin: "center center"
              }}
            >
              <HeroBoard />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-[-7%] right-[-2%] z-20 w-[64%] max-w-[580px] md:w-[58%] lg:w-[52%]">
          <div className="absolute inset-x-[14%] bottom-[8%] h-28 rounded-full bg-black/52 blur-3xl" />
          <div className="absolute inset-y-[14%] left-[12%] w-28 rounded-full bg-black/32 blur-2xl" />
          <Image
            src="/landing/naroman-removebg-preview.png"
            alt="Anime character leaning against the backgammon board"
            width={612}
            height={408}
            priority
            className="relative z-10 h-auto w-full translate-x-[-2%] scale-[1.08] object-contain drop-shadow-[0_42px_36px_rgba(25,18,10,0.44)]"
          />
        </div>
      </div>
    </div>
  );
}

function HeroBoard() {
  return (
    <div className="overflow-hidden rounded-[34px] border border-[#9a7148]/55 bg-[linear-gradient(180deg,#6f4b2e_0%,#9a7045_12%,#e1b877_18%,#c58e59_50%,#7a5332_100%)] p-4 shadow-[0_40px_120px_rgba(33,21,10,0.56)]">
      <div className="relative rounded-[26px] border border-[#5d4027]/72 bg-[linear-gradient(180deg,#6c492d_0%,#8c623f_8%,#7d5535_50%,#5a3b25_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-18px_28px_rgba(28,16,7,0.34)]">
        <div className="absolute inset-[10px] rounded-[20px] ring-1 ring-white/8" />
        <div className="absolute inset-x-0 top-0 h-12 rounded-t-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),transparent)]" />
        <div className="absolute inset-y-0 left-[50%] w-[5.5%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,245,220,0.14),rgba(255,245,220,0.02))] shadow-[inset_0_0_20px_rgba(0,0,0,0.16)]" />

        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_0.5fr_repeat(6,minmax(0,1fr))] gap-1">
          {boardRows[0].map((tone, index) => (
            <BoardPoint key={`hero-top-${index}`} tone={tone} direction="down" index={index} />
          ))}
          <div className="relative flex items-center justify-center overflow-hidden rounded-[12px] border border-white/10 bg-[#4d3522]/82">
            <div className="absolute inset-x-3 top-3 h-px bg-white/12" />
            <div className="absolute inset-x-3 bottom-3 h-px bg-black/14" />
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-6 rounded-full bg-[#f5e9d3] shadow-[inset_0_-2px_0_rgba(0,0,0,0.14),0_5px_8px_rgba(0,0,0,0.14)]" />
              <div className="h-6 w-6 rounded-full bg-[#dfeccf] shadow-[inset_0_-2px_0_rgba(0,0,0,0.14),0_5px_8px_rgba(0,0,0,0.14)]" />
            </div>
          </div>
          {boardRows[1].map((tone, index) => (
            <BoardPoint key={`hero-top-right-${index}`} tone={tone} direction="down" index={index + 6} />
          ))}
        </div>

        <div className="my-1.5 h-px bg-white/10" />

        <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_0.5fr_repeat(6,minmax(0,1fr))] gap-1">
          {boardRows[1].map((tone, index) => (
            <BoardPoint key={`hero-bottom-${index}`} tone={tone} direction="up" index={index + 12} />
          ))}
          <div className="relative flex items-center justify-center overflow-hidden rounded-[12px] border border-white/10 bg-[#4d3522]/82">
            <div className="absolute inset-x-3 top-3 h-px bg-white/12" />
            <div className="absolute inset-x-3 bottom-3 h-px bg-black/14" />
            <div className="h-8 w-16 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,250,240,0.92),rgba(231,211,177,0.88))] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12),0_10px_18px_rgba(0,0,0,0.16)]" />
          </div>
          {boardRows[0].map((tone, index) => (
            <BoardPoint key={`hero-bottom-right-${index}`} tone={tone} direction="up" index={index + 18} />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_40%),linear-gradient(180deg,transparent_72%,rgba(0,0,0,0.08)_100%)]" />
      </div>
    </div>
  );
}

function BoardPoint({
  tone,
  direction,
  index
}: {
  tone: string;
  direction: "up" | "down";
  index: number;
}) {
  const checker = checkerMap.find((item) => item.index === index);

  return (
    <div
      className="relative h-[78px] overflow-hidden rounded-[9px] border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:h-[92px] lg:h-[104px]"
      style={{
        background: tone,
        clipPath: direction === "down" ? "polygon(50% 100%, 0 0, 100% 0)" : "polygon(50% 0, 0 100%, 100% 100%)"
      }}
    >
      {checker ? (
        <div
          className={cn(
            "absolute left-1/2 z-10 h-7 w-7 -translate-x-1/2 rounded-full border border-white/30 shadow-[0_8px_14px_rgba(0,0,0,0.2)] md:h-8 md:w-8 lg:h-9 lg:w-9",
            checker.tone,
            direction === "down" ? "top-3" : "bottom-3"
          )}
        />
      ) : null}
    </div>
  );
}
