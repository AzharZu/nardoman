"use client";

import Link from "next/link";
import { ArrowLeft, Maximize2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AuthMenu } from "@/components/auth-menu";
import { GameBoard } from "@/components/game-board";
import { Badge } from "@/components/ui";
import { formatTrialRemaining, getEffectiveSubscriptionSnapshot } from "@/lib/data/subscription-client";
import { getStoredVibeRoom } from "@/lib/data/vibe-room-client";
import { setStoredVibeRoom } from "@/lib/data/vibe-room-client";
import { useGameStore } from "@/store/game-store";
import { useAuthStore } from "@/store/auth-store";
import { useProfileStore } from "@/store/profile-store";
import type { BotPersonality, MatchMode } from "@/lib/types";
import {
  getVibeRoomConfig,
  isProVibeRoom,
  isVibeRoomKey,
  preloadVibeRoomBackgrounds,
  type VibeRoomKey
} from "@/lib/vibe-rooms";

const MODE_LABELS: Record<MatchMode, string> = {
  quick: "Quick Match",
  bot: "vs Bot",
  ranked: "Ranked",
  friend: "Friend Room",
  tournament: "Tournament"
};

const PERSONALITY_LABELS: Record<BotPersonality, string> = {
  Chill: "Chill",
  Tactical: "Tactical",
  Aggressive: "Aggressive"
};

const AMBIENT_PETALS = [
  { left: "8%", top: "24%", size: 10, duration: 34, delay: 0, drift: 32, rotate: 28, tint: "rgba(255, 232, 238, 0.65)" },
  { left: "18%", top: "12%", size: 8, duration: 28, delay: 2, drift: 24, rotate: -18, tint: "rgba(248, 226, 196, 0.62)" },
  { left: "30%", top: "18%", size: 12, duration: 39, delay: 5, drift: 36, rotate: 12, tint: "rgba(236, 246, 213, 0.6)" },
  { left: "44%", top: "8%", size: 9, duration: 31, delay: 1, drift: 28, rotate: -22, tint: "rgba(255, 238, 225, 0.55)" },
  { left: "58%", top: "22%", size: 11, duration: 36, delay: 3, drift: 30, rotate: 18, tint: "rgba(244, 236, 209, 0.58)" },
  { left: "68%", top: "14%", size: 8, duration: 42, delay: 6, drift: 26, rotate: 32, tint: "rgba(255, 231, 236, 0.5)" },
  { left: "82%", top: "30%", size: 10, duration: 33, delay: 4, drift: 34, rotate: -26, tint: "rgba(241, 245, 216, 0.54)" },
  { left: "90%", top: "18%", size: 7, duration: 27, delay: 1.5, drift: 20, rotate: 24, tint: "rgba(255, 241, 214, 0.58)" }
] as const;

function AmbientScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,244,220,0.5),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(255,210,145,0.28),transparent_30%),linear-gradient(180deg,rgba(255,248,235,0.18),rgba(109,132,73,0.05)_48%,rgba(68,84,40,0.1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,236,0.18),rgba(255,248,236,0.02)_24%,rgba(19,24,14,0.04)_100%)]" />
      <motion.div
        aria-hidden
        className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#fff3d9]/35 blur-3xl"
        animate={{ scale: [1, 1.06, 1], opacity: [0.42, 0.58, 0.42] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-20 bottom-4 h-72 w-72 rounded-full bg-[#f2c47b]/18 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      {AMBIENT_PETALS.map((petal, index) => (
        <motion.span
          key={`${petal.left}-${index}`}
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: petal.left,
            top: petal.top,
            width: petal.size,
            height: Math.round(petal.size * 0.62),
            background: `linear-gradient(135deg, ${petal.tint}, rgba(255,255,255,0.12))`,
            boxShadow: "0 0 18px rgba(255, 248, 228, 0.14)"
          }}
          initial={{ opacity: 0, y: 0, x: 0, rotate: petal.rotate - 20 }}
          animate={{
            opacity: [0, 0.72, 0.42, 0.72, 0],
            y: [0, -60, -120, -180],
            x: [0, petal.drift * 0.45, -petal.drift * 0.35, petal.drift],
            rotate: [petal.rotate, petal.rotate + 90, petal.rotate + 180, petal.rotate + 260]
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear"
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_36%,rgba(36,45,22,0.08)_100%)]" />
    </div>
  );
}

export function GamePageClient() {
  const { matchMode, startNewMatch } = useGameStore();
  const gameStatus = useGameStore((state) => state.game.status);
  const botPersonality = useGameStore((state) => state.game.botPersonality);
  const [fullscreen, setFullscreen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { profile, loadProfile, updateProfile, syncProfileFromLocal } = useProfileStore();
  const [activeRoomKey, setActiveRoomKey] = useState("grass-picnic");

  useEffect(() => {
    startNewMatch(matchMode, botPersonality);
  }, [botPersonality, matchMode, startNewMatch]);

  useEffect(() => {
    if (user) {
      void loadProfile(user.id, user.email);
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
        syncProfileFromLocal(user.id, user.email);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [syncProfileFromLocal, user]);

  const subscription = useMemo(() => getEffectiveSubscriptionSnapshot(profile, user), [profile, user]);
  useEffect(() => {
    const storedRoom = getStoredVibeRoom();
    if (storedRoom && isVibeRoomKey(storedRoom)) {
      setActiveRoomKey(storedRoom);
      return;
    }

    if (subscription.isActive && profile?.favorite_vibe_room && isVibeRoomKey(profile.favorite_vibe_room)) {
      setActiveRoomKey(profile.favorite_vibe_room);
      return;
    }

    setActiveRoomKey("grass-picnic");
  }, [profile, subscription.isActive]);

  const vibeRoom = getVibeRoomConfig(activeRoomKey);
  const roomOptions = useMemo(
    () => [
      getVibeRoomConfig("grass-picnic"),
      getVibeRoomConfig("zen-garden"),
      getVibeRoomConfig("neon-city")
    ],
    []
  );

  const handleRoomSelect = (roomKey: string) => {
    if (!user) return;
    if (isProVibeRoom(roomKey) && !subscription.isActive) return;
    setActiveRoomKey(roomKey);
    setStoredVibeRoom(roomKey as VibeRoomKey);
    void updateProfile(user.id, user.email, { favorite_vibe_room: roomKey });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      setFullscreen(true);
      document.documentElement.requestFullscreen().catch(() => {
        // Fall back to the immersive mode even when the browser blocks fullscreen.
      });
    } else {
      document.exitFullscreen().catch(() => {
        // Ignore exit failures and still leave the immersive mode.
      });
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (gameStatus !== "finished") return;

    const redirectTimer = window.setTimeout(() => {
      window.location.replace("/");
    }, 2000);

    return () => window.clearTimeout(redirectTimer);
  }, [gameStatus]);

  return (
      <div
        className="relative min-h-screen overflow-hidden bg-[#efe9dc] text-[#1f2639]"
        style={{
          backgroundImage:
            `linear-gradient(180deg,rgba(255,246,229,0.34),rgba(244,236,214,0.18) 42%,rgba(73,92,42,0.08)),url('${vibeRoom.backgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundAttachment: fullscreen ? "fixed" : "scroll"
        }}
      >
      <AmbientScene />
      {!fullscreen && (
        <header className="relative z-10 border-b border-[#d6cdbd]/70 bg-[#f8f6ee]/78 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-[#2a3041]">
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full bg-[#edf5e1] px-4 py-1.5 text-sm font-semibold text-[#5d8f49]">
                  {MODE_LABELS[matchMode]}
                </span>
                {matchMode === "bot" && (
                  <span className="rounded-full bg-[#f5ead4] px-4 py-1.5 text-sm font-semibold text-[#9b7b3b]">
                    {PERSONALITY_LABELS[botPersonality]}
                  </span>
                )}
                {subscription.isActive ? (
                  <Badge className="border-[#a7c994] bg-[#edf6e5] px-4 py-1.5 text-sm font-semibold text-[#5d8f49]">
                    Pro active · {formatTrialRemaining(subscription.remainingMs)}
                  </Badge>
                ) : null}
                <AuthMenu />
                <button
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#6dae58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5fa04a]"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Play Fullscreen</span>
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[24px] border border-[#d8ccb8] bg-[#fffaf3]/90 px-3 py-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#6e6a5d]">Vibe room</p>
                <p className="mt-1 text-sm font-semibold text-[#1f2639]">{vibeRoom.label}</p>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[#6f7480]">{vibeRoom.description}</p>
              <div className="ml-auto flex flex-wrap gap-2">
                {roomOptions.map((room) => {
                  const locked = room.proOnly && !subscription.isActive;
                  const active = room.key === activeRoomKey;
                  return (
                    <button
                      key={room.key}
                      type="button"
                      disabled={locked}
                      onClick={() => handleRoomSelect(room.key)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-[#1f2639] text-white shadow-[0_12px_28px_rgba(31,38,57,0.22)]"
                          : locked
                            ? "border border-dashed border-[#d8ccb8] bg-[#f8f3ea] text-[#a08d67] opacity-80"
                            : "border border-[#d8ccb8] bg-white text-[#2a3041] hover:border-[#6ca86b] hover:text-[#5d8f49]"
                      }`}
                    >
                      <span>{room.label}</span>
                      {locked ? <span className="ml-2 text-[0.7rem] uppercase tracking-[0.16em]">Locked</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>
      )}

      {fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-[#1f2639]/78 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(21,28,16,0.25)] backdrop-blur-md"
        >
          <X className="h-4 w-4" />
          Exit
        </button>
      )}

      <div className={fullscreen ? "relative z-10 min-h-screen" : "relative z-10 min-h-screen"}>
        <div className={fullscreen ? "mx-auto flex min-h-screen w-full max-w-[1900px] items-center px-1 py-2 sm:px-2 lg:px-4" : "min-h-screen"}>
          <GameBoard boardOnly={fullscreen} vibeRoom={activeRoomKey} />
        </div>
      </div>
    </div>
  );
}
