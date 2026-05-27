"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Calendar, Flame, MapPin, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthMenu } from "@/components/auth-menu";
import { Badge, Container, LinkButton, Panel } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import { useProfileStore } from "@/store/profile-store";
import { getMatchOpponentLabel, loadMatchHistory, type MatchHistoryEntry } from "@/lib/data/match-history";
import { formatTrialRemaining, getSubscriptionSnapshot } from "@/lib/data/subscription-client";
import { getVibeRoomConfig } from "@/lib/vibe-rooms";
import { leaderboardSeed, statsSeed } from "@/lib/mock-data";
import { hasSupabaseConfig, getSupabaseSetupMessage } from "@/lib/supabase/config";

const guestGames = [
  { result: "W", name: "vs Picnic Bot", room: "Grass Picnic", time: "Today", score: "5-3", win: true },
  { result: "L", name: "vs Rooftop Rival", room: "Sunset Rooftop", time: "Yesterday", score: "4-7", win: false },
  { result: "W", name: "vs Zen Friend", room: "Zen Garden", time: "2 days ago", score: "6-4", win: true }
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const { profile, loadProfile, syncProfileFromLocal } = useProfileStore();
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const friendRoomHref = useMemo(() => "/game/setup?mode=friend" as Route, []);
  const subscription = useMemo(() => getSubscriptionSnapshot(profile), [profile]);

  useEffect(() => {
    if (user) {
      void loadProfile(user.id, user.email);
    }
  }, [loadProfile, user]);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }
    setHistory(loadMatchHistory());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "backgammon-rush-match-history") {
        setHistory(loadMatchHistory());
        return;
      }
      if (user && (event.key === `backgammon-rush-profile-${user.id}` || event.key === `backgammon-rush-subscription-${user.id}`)) {
        syncProfileFromLocal(user.id, user.email);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [syncProfileFromLocal, user]);

  const recentGames = useMemo(() => {
    if (!user) {
      const localHistory = loadMatchHistory();
      if (localHistory.length === 0) {
        return guestGames;
      }

      return localHistory.slice(0, 5).map((entry) => ({
        result: entry.result === "win" ? "W" : "L",
        name: getMatchOpponentLabel(entry),
        room: `${entry.vibeRoom}${entry.endedEarly ? " · Forfeit" : ""}`,
        time: new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: entry.score,
        win: entry.result === "win"
      }));
    }

    const owned = history.filter((entry) => entry.userId === user.id);
    const list = owned.length > 0 ? owned : history;

    if (list.length === 0) {
      return [];
    }

    return list.slice(0, 5).map((entry) => ({
      result: entry.result === "win" ? "W" : "L",
      name: getMatchOpponentLabel(entry),
      room: `${entry.vibeRoom}${entry.endedEarly ? " · Forfeit" : ""}`,
      time: new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: entry.score,
      win: entry.result === "win"
    }));
  }, [history, user]);

  const stats = useMemo(() => {
    if (!user) {
      return [
        { icon: Trophy, value: String(statsSeed.quickWins), title: "Guest wins", hint: `${statsSeed.matchesPlayed} matches played`, tone: "text-[#67a859] border-[#d7dfd1]" },
        { icon: Flame, value: String(statsSeed.bestStreak), title: "Best streak", hint: "Signed out view", tone: "text-[#f3a077] border-[#f3dfd4]" },
        { icon: MapPin, value: "Guest", title: "City", hint: "Sign in to customize", tone: "text-[#7cbce6] border-[#d0e2f0]" },
        { icon: Calendar, value: "Grass Picnic", title: "Vibe room", hint: "Default room", tone: "text-[#dea734] border-[#e8dcc0]" }
      ];
    }

    return [
      { icon: Trophy, value: String(profile?.wins ?? 0), title: "Total Wins", hint: `${profile?.rating ?? 1200} rating`, tone: "text-[#67a859] border-[#d7dfd1]" },
      { icon: Flame, value: String(profile?.level ?? 1), title: "Level", hint: `${profile?.losses ?? 0} losses`, tone: "text-[#f3a077] border-[#f3dfd4]" },
      { icon: MapPin, value: profile?.city ?? user.city, title: "City", hint: user.email, tone: "text-[#7cbce6] border-[#d0e2f0]" },
      {
        icon: Calendar,
        value: getVibeRoomConfig(profile?.favorite_vibe_room ?? "grass-picnic").label,
        title: "Preferred vibe",
        hint: "Change it in Profile settings",
        tone: "text-[#dea734] border-[#e8dcc0]"
      }
    ];
  }, [profile, user]);

  if (!hydrated) {
    return (
      <div className="page-shell">
        <Container className="py-10">
          <Panel className="space-y-3">
            <p className="text-sm text-[#6f7480]">Checking your session...</p>
          </Panel>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-[#2a3041]">
              <ArrowLeft className="h-5 w-5" />
              Home
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-[#1f2639] md:text-4xl">Dashboard</h1>
              <p className="text-sm text-[#6f7480]">
                {user ? "Your profile, match history, and product progress." : "Signed out view with public data."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AuthMenu />
            <Link href="/game" className="rounded-2xl bg-[#6dae58] px-6 py-2.5 text-sm font-semibold text-white">
              Play Now
            </Link>
          </div>
        </Container>
      </header>

      <Container className="py-8 lg:py-10">
        {!hasSupabaseConfig() ? (
          <div className="mb-6 rounded-[24px] border border-[#e2d0a5] bg-[#fbf0d8] px-5 py-4 text-sm text-[#8d6a2b]">
            {getSupabaseSetupMessage("authentication, profile sync, and match persistence")}
          </div>
        ) : null}

        <section className="hero-green flex flex-col gap-5 rounded-[34px] px-6 py-8 text-white md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 text-5xl">
            <UserRound className="h-12 w-12" />
          </div>
          <div className="flex-1">
            <h2 className="text-4xl font-semibold md:text-5xl">
              {user ? `Welcome back, ${profile?.username ?? user.displayName}!` : "Sign in to continue"}
            </h2>
            <p className="mt-2 max-w-3xl text-lg text-white/90 md:text-xl">
              {user
                ? `Level ${profile?.level ?? 1} · Rating ${profile?.rating ?? 1200} · ${profile?.wins ?? 0} wins / ${profile?.losses ?? 0} losses · ${profile?.playstyle ?? "Tactical"} playstyle`
                : "Use this mode to explore the app before signing in."}
            </p>
          </div>
          <div className="rounded-[26px] bg-white/12 px-4 py-3 text-sm backdrop-blur-sm">
            <p className="uppercase tracking-[0.24em] text-white/70">Session</p>
            <p className="mt-1 font-semibold">{user ? user.email : "Guest"}</p>
            <p className="mt-1 text-xs text-white/80">
              {user
                ? subscription.isActive
                  ? `Pro active · ${formatTrialRemaining(subscription.remainingMs)} left`
                  : profile?.trial_started_at
                    ? "Trial ended"
                    : "Free plan"
                : "Signed out"}
            </p>
          </div>
        </section>

        <section className="mt-7 grid gap-3 md:grid-cols-3">
          <QuickAction
            href="/game"
            title="Play vs Bot"
            description="Launch a fresh white-side match with coach guidance."
            label="Start match"
          />
          <QuickAction
            href={friendRoomHref}
            title="Create Friend Room"
            description="Generate a shareable room and invite a friend."
            label="Share link"
          />
          <QuickAction
            href="/profile"
            title="Edit Profile"
            description="Update username, city, and your preferred vibe room."
            label="Open settings"
          />
        </section>

        <section className="mt-7 grid gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.title} className={`soft-panel border p-5 ${stat.tone.split(" ")[1]}`}>
              <div className="flex items-center justify-between">
                <stat.icon className={`h-9 w-9 ${stat.tone.split(" ")[0]}`} />
                <p className="text-4xl font-semibold text-[#202738] md:text-5xl">{stat.value}</p>
              </div>
              <p className="mt-6 text-xl text-[#6f7480]">{stat.title}</p>
              <p className={`mt-4 text-base font-medium ${stat.tone.split(" ")[0]}`}>{stat.hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <article className="soft-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-[#1f2639]">Recent Games</h3>
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#6e6a5d]">
                {user ? `${recentGames.length} saved` : "Public data"}
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {recentGames.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#d8ccb8] bg-[#fffaf3] px-4 py-8 text-center text-[#6f7480]">
                  No saved matches yet. Finish a game to populate this section.
                </div>
              ) : (
                recentGames.map((game) => (
                  <div key={`${game.name}-${game.score}-${game.time}`} className="flex items-center justify-between rounded-3xl bg-[#f2ede0] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${game.win ? "bg-[#dce7c9] text-[#6ca857]" : "bg-[#f6e5d7] text-[#f3a077]"}`}>
                        {game.result}
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-[#202738]">{game.name}</p>
                        <p className="text-sm text-[#6f7480]">
                          {game.room} · {game.time}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold text-[#202738]">{game.score}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="soft-panel p-5">
            <h3 className="text-2xl font-semibold text-[#1f2639]">Leaderboard Preview</h3>
            <div className="mt-5 space-y-3">
              {leaderboardSeed.slice(0, 4).map((row) => (
                <div key={row.userId} className="flex items-center justify-between rounded-3xl bg-[#f2ede0] px-4 py-4">
                  <div>
                    <p className="text-lg font-semibold text-[#202738]">{row.displayName}</p>
                    <p className="text-sm text-[#6f7480]">{row.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#67a859]">{row.rating}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#6f7480]">Rating</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </Container>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  label
}: {
  href: Route;
  title: string;
  description: string;
  label: string;
}) {
  return (
    <article className="soft-panel flex flex-col justify-between gap-4 p-5">
      <div>
        <p className="text-lg font-semibold text-[#1f2639]">{title}</p>
        <p className="mt-2 text-sm leading-6 text-[#6f7480]">{description}</p>
      </div>
      <LinkButton href={href} className="w-full">
        {label}
      </LinkButton>
    </article>
  );
}
