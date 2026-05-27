"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, Leaf, Lock, Target } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createRoomId } from "@/lib/data/room-client";
import { formatTrialRemaining, getEffectiveSubscriptionSnapshot } from "@/lib/data/subscription-client";
import { getStoredVibeRoom, setStoredVibeRoom } from "@/lib/data/vibe-room-client";
import { getVibeRoomConfig, isVibeRoomKey, preloadVibeRoomBackgrounds, type VibeRoomKey } from "@/lib/vibe-rooms";
import { useAuthStore } from "@/store/auth-store";
import { useGameStore } from "@/store/game-store";
import { useProfileStore } from "@/store/profile-store";
import type { BotPersonality } from "@/lib/types";

type SetupMode = "bot" | "friend" | "local";

const VIBE_OPTIONS = [
  getVibeRoomConfig("grass-picnic"),
  getVibeRoomConfig("zen-garden"),
  getVibeRoomConfig("neon-city")
] as const;

const MODE_OPTIONS: Array<{
  id: SetupMode;
  label: string;
}> = [
  { id: "bot", label: "VS BOT" },
  { id: "friend", label: "FRIEND ROOM" },
  { id: "local", label: "LOCAL MATCH" }
];

const PERSONALITY_OPTIONS: Array<{
  id: BotPersonality;
  title: string;
  description: string;
  icon: typeof Leaf;
}> = [
  {
    id: "Chill",
    title: "CHILL",
    description: "Calm defensive play",
    icon: Leaf
  },
  {
    id: "Tactical",
    title: "TACTICAL",
    description: "Balanced strategic play",
    icon: Target
  },
  {
    id: "Aggressive",
    title: "AGGRESSIVE",
    description: "Fast risky play",
    icon: Flame
  }
];

const LEAFS = [
  { left: "8%", top: "18%", size: 12, delay: 0, duration: 18, drift: 40, rotate: -18 },
  { left: "16%", top: "52%", size: 9, delay: 1.8, duration: 22, drift: 32, rotate: 24 },
  { left: "31%", top: "13%", size: 11, delay: 3.2, duration: 20, drift: 28, rotate: -12 },
  { left: "48%", top: "34%", size: 10, delay: 1.1, duration: 24, drift: 44, rotate: 16 },
  { left: "67%", top: "16%", size: 8, delay: 2.7, duration: 19, drift: 36, rotate: -22 },
  { left: "78%", top: "42%", size: 12, delay: 0.8, duration: 23, drift: 30, rotate: 18 },
  { left: "88%", top: "24%", size: 9, delay: 3.6, duration: 21, drift: 26, rotate: -8 }
] as const;

export default function GameSetupPage() {
  const router = useRouter();
  const startNewMatch = useGameStore((state) => state.startNewMatch);
  const user = useAuthStore((state) => state.user);
  const { profile, loadProfile, updateProfile } = useProfileStore();
  const subscription = useMemo(() => getEffectiveSubscriptionSnapshot(profile, user), [profile, user]);
  const [mode, setMode] = useState<SetupMode>("bot");
  const [personality, setPersonality] = useState<BotPersonality>("Tactical");
  const [selectedRoom, setSelectedRoom] = useState<VibeRoomKey>("grass-picnic");
  const [notice, setNotice] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (user) {
      void loadProfile(user.id, user.email, true);
    }
  }, [loadProfile, user]);

  useEffect(() => {
    preloadVibeRoomBackgrounds(["grass-picnic", "zen-garden", "neon-city"]);
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileKey = `backgammon-rush-profile-${user.id}`;
    const subscriptionKey = `backgammon-rush-subscription-${user.id}`;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === profileKey || event.key === subscriptionKey) {
        void loadProfile(user.id, user.email, true);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadProfile, user]);

  useEffect(() => {
    void router.prefetch("/pro");
    void router.prefetch("/game");
  }, [router]);

  useEffect(() => {
    const storedRoom = getStoredVibeRoom();
    if (storedRoom) {
      setSelectedRoom(storedRoom);
      return;
    }

    if (subscription.isActive && profile?.favorite_vibe_room && isVibeRoomKey(profile.favorite_vibe_room)) {
      setSelectedRoom(profile.favorite_vibe_room);
      return;
    }

    setSelectedRoom("grass-picnic");
  }, [profile, subscription.isActive]);

  const selectedRoomConfig = useMemo(
    () => VIBE_OPTIONS.find((room) => room.key === selectedRoom) ?? VIBE_OPTIONS[0],
    [selectedRoom]
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const handleVibeSelect = async (roomKey: VibeRoomKey) => {
    const room = VIBE_OPTIONS.find((item) => item.key === roomKey);
    if (!room) return;

    if (room.proOnly && !subscription.isActive) {
      setNotice("Zen Garden and Neon City unlock on Pro.");
      router.push("/pro");
      return;
    }

    setSelectedRoom(roomKey);
    setStoredVibeRoom(roomKey);
    setNotice(`Atmosphere set to ${room.label}.`);

    if (user) {
      void updateProfile(user.id, user.email, { favorite_vibe_room: roomKey });
    }
  };

  const handleEnterMatch = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setNotice(null);

    try {
      if (selectedRoomConfig.proOnly && !subscription.isActive) {
        setNotice("Zen Garden and Neon City unlock on Pro.");
        router.push("/pro");
        return;
      }

      setStoredVibeRoom(selectedRoomConfig.key);

      if (user) {
        void updateProfile(user.id, user.email, { favorite_vibe_room: selectedRoomConfig.key });
      }

      if (mode === "bot") {
        startNewMatch("bot", personality);
        router.push("/game");
        return;
      }

      if (mode === "local") {
        startNewMatch("quick");
        router.push("/game");
        return;
      }

      const roomId = createRoomId();
      router.push(`/room/${roomId}`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#edf4e6_0%,#f5f1e7_52%,#eef2e8_100%)] text-[#192117]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(163,196,121,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(236,205,132,0.12),transparent_24%),radial-gradient(circle_at_center,rgba(255,255,255,0.45),transparent_40%)]" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1200px] px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-6">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-[#2b3724] shadow-[0_10px_24px_rgba(27,44,20,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="hidden rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#5b6851] shadow-[0_10px_24px_rgba(27,44,20,0.05)] sm:block">
            Game setup
          </div>

          <Link
            href="/pro"
            prefetch
            className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ba] bg-[#eef7e2] px-4 py-2 text-sm font-semibold text-[#4f7d3e] shadow-[0_10px_24px_rgba(27,44,20,0.05)] transition hover:-translate-y-0.5 hover:border-[#b9d6a1] hover:bg-[#e6f3d6]"
          >
            Pro rooms
          </Link>
        </header>

        <section className="mx-auto mt-12 max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#182015] sm:text-5xl lg:text-6xl">Choose your atmosphere</h1>
          <p className="mt-4 text-base leading-7 text-[#5d6755] sm:text-lg">Pick a room and start your match.</p>
        </section>

        <section className="relative mx-auto mt-12 w-full max-w-[1100px]">
          <div className="relative h-[400px] overflow-hidden rounded-[32px] border border-white/50 shadow-[0_34px_90px_rgba(39,59,30,0.24)] sm:h-[440px] lg:h-[480px]">
            <Image src={selectedRoomConfig.backgroundImage} alt="" fill priority className="object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,8,0.06)_0%,rgba(8,14,8,0.04)_38%,rgba(7,11,8,0.62)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_76%_18%,rgba(182,226,131,0.2),transparent_22%),radial-gradient(circle_at_50%_70%,rgba(0,0,0,0.22),transparent_42%)]" />

            {LEAFS.map((leaf, index) => (
              <motion.span
                key={`${leaf.left}-${index}`}
                aria-hidden
                className="absolute rounded-full bg-[linear-gradient(135deg,rgba(241,247,220,0.95),rgba(172,212,109,0.55))] blur-[0.2px]"
                style={{
                  left: leaf.left,
                  top: leaf.top,
                  width: leaf.size,
                  height: Math.max(5, Math.round(leaf.size * 0.62)),
                  boxShadow: "0 0 18px rgba(255,255,255,0.2)"
                }}
                initial={{ opacity: 0, y: 0, x: 0, rotate: leaf.rotate }}
                animate={{
                  opacity: [0, 0.72, 0.35, 0.72, 0],
                  y: [0, -36, -82, -128],
                  x: [0, leaf.drift * 0.28, -leaf.drift * 0.2, leaf.drift * 0.36],
                  rotate: [leaf.rotate, leaf.rotate + 85, leaf.rotate + 170, leaf.rotate + 260]
                }}
                transition={{
                  duration: leaf.duration,
                  delay: leaf.delay,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear"
                }}
              />
            ))}

            <div className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/18 px-4 py-2 text-sm font-medium text-white backdrop-blur-md sm:left-6 sm:top-6">
              {selectedRoomConfig.label}
            </div>
            <div className="absolute right-4 top-4 z-20 rounded-full border border-emerald-200/30 bg-emerald-950/35 px-4 py-2 text-sm font-medium text-emerald-50 backdrop-blur-md sm:right-6 sm:top-6">
              AI Coach Ready
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 h-[54%] bg-[linear-gradient(180deg,transparent_0%,rgba(3,8,4,0.12)_22%,rgba(3,8,4,0.86)_100%)]" />

            <div className="absolute left-1/2 top-[53%] z-20 w-[88%] max-w-[730px] -translate-x-1/2 -translate-y-1/2 rotate-[3deg] sm:w-[84%] lg:left-[60%] lg:w-[70%]">
              <BoardPreview />
            </div>

            <div className="absolute bottom-6 left-6 z-30 max-w-[26rem] text-white sm:bottom-8 sm:left-8">
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{selectedRoomConfig.label}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/78 sm:text-base">{selectedRoomConfig.description}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 w-full max-w-[1100px]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[#6c7b61]">Vibe rooms</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#182015]">Choose the room mood.</h2>
            </div>
            {subscription.isActive ? (
              <Badge className="border-[#a7c994] bg-[#edf6e5] px-4 py-2 text-sm font-semibold text-[#5d8f49]">
                Pro active · {formatTrialRemaining(subscription.remainingMs)}
              </Badge>
            ) : (
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] px-4 py-2 text-sm font-semibold text-[#6e6a5d]">
                Grass Picnic is free
              </Badge>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {VIBE_OPTIONS.map((room) => {
              const active = selectedRoom === room.key;
              const locked = room.proOnly && !subscription.isActive;

              return (
                <motion.button
                  key={room.key}
                  type="button"
                  onClick={() => void handleVibeSelect(room.key)}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={active}
                  disabled={locked}
                  className={cn(
                    "relative overflow-hidden rounded-[28px] border text-left transition duration-300",
                    active
                      ? "border-emerald-300/80 shadow-[0_0_0_1px_rgba(126,184,94,0.16),0_18px_40px_rgba(90,150,70,0.16)]"
                      : "border-white/70 shadow-[0_14px_34px_rgba(30,46,20,0.08)] hover:border-emerald-200 hover:shadow-[0_18px_42px_rgba(85,138,58,0.14)]",
                    locked && "opacity-90"
                  )}
                >
                  <div className="relative h-40">
                    <Image src={room.backgroundImage} alt="" fill className="object-cover object-center" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,15,0.14)_0%,rgba(17,24,15,0.18)_35%,rgba(10,14,10,0.76)_100%)]" />
                    <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />

                    <div className="absolute left-4 top-4">
                      <Badge
                        className={cn(
                          "px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.22em]",
                          active
                            ? "border-emerald-200/30 bg-emerald-950/35 text-emerald-50"
                            : "border-white/14 bg-black/22 text-white"
                        )}
                      >
                        {room.label}
                      </Badge>
                    </div>

                    <div className="absolute right-4 top-4">
                      {locked ? (
                        <Badge className="border-[#e0c58f]/50 bg-[#fff0d4]/92 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#8d6a2b]">
                          Locked
                        </Badge>
                      ) : active ? (
                        <Badge className="border-[#a7c994]/35 bg-[#edf6e5]/92 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#5d8f49]">
                          Selected
                        </Badge>
                      ) : null}
                    </div>

                    {locked ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0c120d]/22">
                        <div className="flex items-center gap-2 rounded-full border border-white/18 bg-black/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                          <Lock className="h-4 w-4" />
                          Pro required
                        </div>
                      </div>
                    ) : null}

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xl font-semibold tracking-tight">{room.label}</p>
                      <p className="mt-1 text-sm leading-6 text-white/80">{room.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="mt-14">
          <div className="mx-auto grid w-full max-w-[900px] gap-4 md:grid-cols-3">
            {MODE_OPTIONS.map((item) => {
              const active = mode === item.id;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={active}
                  className={cn(
                    "flex h-20 w-full items-center justify-center rounded-full border px-6 text-center text-sm font-semibold tracking-[0.28em] transition duration-300 sm:h-[88px] sm:text-base",
                    active
                      ? "border-emerald-300/70 bg-[linear-gradient(180deg,rgba(233,248,222,0.98),rgba(214,236,192,0.98))] text-[#23421d] shadow-[0_0_0_1px_rgba(127,185,96,0.25),0_18px_42px_rgba(102,159,72,0.28)]"
                      : "border-white/70 bg-white/70 text-[#475140] shadow-[0_10px_24px_rgba(27,44,20,0.08)] hover:border-emerald-200 hover:bg-white"
                  )}
                >
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        </section>

        {mode === "bot" ? (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-14"
          >
            <div className="mx-auto grid w-full max-w-[820px] gap-4 sm:grid-cols-3">
              {PERSONALITY_OPTIONS.map((item) => {
                const active = personality === item.id;
                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => setPersonality(item.id)}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-[150px] w-full flex-col items-start rounded-[28px] border p-5 text-left transition duration-300",
                      active
                        ? "border-emerald-300/80 bg-[linear-gradient(180deg,rgba(246,251,239,0.98),rgba(229,244,216,0.96))] shadow-[0_0_0_1px_rgba(126,184,94,0.18),0_18px_40px_rgba(90,150,70,0.18)]"
                        : "border-white/70 bg-white/70 shadow-[0_14px_34px_rgba(30,46,20,0.08)] hover:border-emerald-200 hover:shadow-[0_18px_42px_rgba(85,138,58,0.14)]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
                        active ? "bg-emerald-100 text-emerald-700" : "bg-[#edf3e3] text-[#5f7e48]"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-4 text-[0.78rem] font-semibold tracking-[0.26em] text-[#263325]">{item.title}</span>
                    <p className="mt-2 text-sm leading-6 text-[#66705e]">{item.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        ) : null}

        {notice ? (
          <div className="mx-auto mt-10 max-w-[900px] rounded-[22px] border border-[#d9d0bf] bg-[#fffaf3] px-4 py-3 text-sm leading-6 text-[#5f665b]">
            {notice}
          </div>
        ) : null}

        <section className="mt-auto flex justify-center pt-16 pb-4">
          <motion.button
            type="button"
            onClick={() => void handleEnterMatch()}
            disabled={isStarting}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "h-16 w-[320px] max-w-full rounded-full bg-[linear-gradient(180deg,#79b95c_0%,#5f9e47_100%)] px-8 text-lg font-semibold text-white shadow-[0_24px_54px_rgba(89,151,64,0.34)] transition duration-300",
              "hover:shadow-[0_28px_60px_rgba(89,151,64,0.42)] disabled:cursor-wait disabled:opacity-80"
            )}
            aria-busy={isStarting}
          >
            Enter Match
          </motion.button>
        </section>
      </div>
    </main>
  );
}

function BoardPreview() {
  return (
    <div className="relative mx-auto aspect-[1.72/1] w-full max-w-[720px]">
      <div className="absolute inset-[8%] rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_28%),linear-gradient(135deg,#9a6d3a_0%,#6f4527_100%)] shadow-[0_40px_90px_rgba(0,0,0,0.48)]" />
      <div className="absolute inset-[10.25%] rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,#efd5a4_0%,#d9b06e_22%,#bd874d_52%,#8d5c33_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_35%,rgba(0,0,0,0.1)_100%)]" />

        <div className="absolute inset-[6%] grid grid-cols-[1fr_0.12fr_1fr] items-stretch gap-2">
          <div className="grid h-full grid-cols-6 grid-rows-2 gap-1.5">
            {LEFT_TRIANGLES.map((tone, index) => (
              <Triangle key={`left-${index}`} tone={tone} flip={index < 6} />
            ))}
          </div>

          <div className="relative rounded-[18px] bg-[linear-gradient(180deg,#7f5831_0%,#5d3c22_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="absolute inset-y-3 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(0,0,0,0.12))]" />
            <div className="absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/10" />
            <CheckerStack className="left-[-20%] top-[9%]" color="dark" count={3} />
            <CheckerStack className="left-[68%] top-[52%]" color="light" count={2} />
          </div>

          <div className="grid h-full grid-cols-6 grid-rows-2 gap-1.5">
            {RIGHT_TRIANGLES.map((tone, index) => (
              <Triangle key={`right-${index}`} tone={tone} flip={index < 6} />
            ))}
          </div>
        </div>

        <div className="absolute inset-x-[10%] bottom-[10%] flex items-end justify-between">
          <CheckerStack className="translate-y-2" color="light" count={5} />
          <CheckerStack className="translate-y-1" color="dark" count={4} />
        </div>
      </div>

      <div className="absolute inset-x-[20%] bottom-[2%] h-10 rounded-full bg-black/35 blur-3xl" />
    </div>
  );
}

function Triangle({ tone, flip }: { tone: "light" | "dark"; flip: boolean }) {
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-[2px]", flip ? "self-start" : "self-end")}
      style={{
        clipPath: flip ? "polygon(50% 0, 0 100%, 100% 100%)" : "polygon(0 0, 100% 0, 50% 100%)"
      }}
    >
      <div
        className={cn(
          "absolute inset-0",
          tone === "dark" ? "bg-[linear-gradient(180deg,#7f3f2d_0%,#5c281e_100%)]" : "bg-[linear-gradient(180deg,#f6e4ba_0%,#e5c48d_100%)]"
        )}
      />
    </div>
  );
}

function CheckerStack({
  color,
  count,
  className
}: {
  color: "light" | "dark";
  count: number;
  className?: string;
}) {
  const fill =
    color === "light"
      ? "bg-[linear-gradient(180deg,#fbf1da_0%,#d8bb86_100%)]"
      : "bg-[linear-gradient(180deg,#5d3a24_0%,#2f1b13_100%)]";

  return (
    <div className={cn("absolute flex flex-col-reverse items-center", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={`${color}-${count}-${index}`}
          className={cn("h-7 w-7 rounded-full border shadow-[0_4px_10px_rgba(0,0,0,0.28)] sm:h-8 sm:w-8", fill, color === "light" ? "border-white/65" : "border-white/15")}
          style={{
            marginTop: index === 0 ? 0 : -7
          }}
        />
      ))}
    </div>
  );
}

const LEFT_TRIANGLES: Array<"light" | "dark"> = ["light", "dark", "light", "dark", "light", "dark", "dark", "light", "dark", "light", "dark", "light"];
const RIGHT_TRIANGLES: Array<"light" | "dark"> = ["dark", "light", "dark", "light", "dark", "light", "light", "dark", "light", "dark", "light", "dark"];
