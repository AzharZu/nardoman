import { leaderboardSeed, achievementSeed, statsSeed } from "@/lib/mock-data";
import { normalizeProfileRow } from "@/lib/data/profile-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AchievementRecord, LeaderboardEntry, MatchMode, Profile, StatisticRecord } from "@/lib/types";

type LeaderboardRow = Partial<LeaderboardEntry> & {
  display_name?: string | null;
  username?: string | null;
  user_id?: string | null;
  streak?: number | null;
  rank?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StatisticRow = Partial<StatisticRecord> & {
  user_id?: string | null;
  matches_played?: number | null;
  quick_wins?: number | null;
  best_streak?: number | null;
  average_move_quality?: number | null;
  favorite_mode?: MatchMode | null;
};

type AchievementRow = Partial<AchievementRecord> & {
  user_id?: string | null;
  unlocked_at?: string | null;
};

function normalizeLeaderboardRow(row: LeaderboardRow, fallbackRank: number): LeaderboardEntry {
  return {
    id: String(row.id ?? row.user_id ?? `lb_${fallbackRank}`),
    userId: String(row.userId ?? row.user_id ?? row.id ?? `u_${fallbackRank}`),
    displayName: row.displayName ?? row.display_name ?? row.username ?? "Player",
    city: row.city ?? "Almaty",
    rating: typeof row.rating === "number" ? row.rating : 1200,
    wins: typeof row.wins === "number" ? row.wins : 0,
    streak: typeof row.streak === "number" ? row.streak : 0,
    rank: typeof row.rank === "number" ? row.rank : fallbackRank
  };
}

function normalizeStatisticRow(row: StatisticRow, fallbackId = "stats_1"): StatisticRecord {
  return {
    id: String(row.id ?? row.userId ?? row.user_id ?? fallbackId),
    userId: String(row.userId ?? row.user_id ?? row.id ?? "u1"),
    matchesPlayed: typeof row.matchesPlayed === "number" ? row.matchesPlayed : typeof row.matches_played === "number" ? row.matches_played : 0,
    quickWins: typeof row.quickWins === "number" ? row.quickWins : typeof row.quick_wins === "number" ? row.quick_wins : 0,
    bestStreak: typeof row.bestStreak === "number" ? row.bestStreak : typeof row.best_streak === "number" ? row.best_streak : 0,
    averageMoveQuality:
      typeof row.averageMoveQuality === "number"
        ? row.averageMoveQuality
        : typeof row.average_move_quality === "number"
          ? row.average_move_quality
          : 0,
    favoriteMode: row.favoriteMode ?? row.favorite_mode ?? "quick"
  };
}

function normalizeAchievementRow(row: AchievementRow, fallbackIndex: number): AchievementRecord {
  return {
    id: String(row.id ?? row.userId ?? row.user_id ?? `ach_${fallbackIndex}`),
    userId: String(row.userId ?? row.user_id ?? row.id ?? `u_${fallbackIndex}`),
    title: row.title ?? "Achievement",
    description: row.description ?? "",
    unlockedAt: row.unlockedAt ?? row.unlocked_at ?? null
  };
}

export async function getLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return leaderboardSeed;
  }

  const { data: primaryRows, error: primaryError } = await supabase
    .from("leaderboard_entries")
    .select("*")
    .order("rank", { ascending: true })
    .limit(25);

  if (!primaryError && primaryRows?.length) {
    return primaryRows.map((row, index) => normalizeLeaderboardRow(row as LeaderboardRow, index + 1));
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank", { ascending: true })
    .limit(25);

  if (!legacyError && legacyRows?.length) {
    return legacyRows.map((row, index) => normalizeLeaderboardRow(row as LeaderboardRow, index + 1));
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, city, rating, wins, losses, favorite_vibe_room")
    .order("rating", { ascending: false })
    .limit(25);

  if (!profileError && profileRows?.length) {
    return profileRows.map((row, index) =>
      normalizeLeaderboardRow(
        {
          id: row.id,
          user_id: row.id,
          display_name: row.username,
          city: row.city,
          rating: row.rating,
          wins: row.wins,
          streak: 0,
          rank: index + 1
        },
        index + 1
      )
    );
  }

  return leaderboardSeed;
}

export async function getStatisticsForUser(userId?: string | null): Promise<StatisticRecord> {
  const supabase = createSupabaseServerClient();
  if (!supabase || !userId) {
    return statsSeed;
  }

  const { data, error } = await supabase.from("statistics").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) {
    return statsSeed;
  }
  return normalizeStatisticRow(data as StatisticRow, String((data as StatisticRow).id ?? "stats_1"));
}

export async function getAchievementsForUser(userId?: string | null): Promise<AchievementRecord[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase || !userId) {
    return achievementSeed;
  }

  const { data, error } = await supabase.from("achievements").select("*").eq("user_id", userId).order("unlocked_at", {
    ascending: false
  });

  if (error || !data?.length) {
    return achievementSeed;
  }

  return data.map((row, index) => normalizeAchievementRow(row as AchievementRow, index + 1));
}

export async function getOrCreateProfile(userId: string, email: string, displayName?: string): Promise<Profile> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    // Minimal local profile when Supabase is not configured.
    return {
      id: userId,
      email,
      username: email.split("@")[0] || "Player",
      city: "Almaty",
      avatar_url: null,
      level: 1,
      rating: 1200,
      wins: 0,
      losses: 0,
      favorite_vibe_room: "grass-picnic",
      subscription_status: "free",
      trial_started_at: null,
      trial_ends_at: null,
      pro_until: null,
      created_at: new Date().toISOString()
    };
  }

  const { data: existing, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!error && existing) {
    return normalizeProfileRow(existing as Record<string, unknown>, userId, email);
  }

  const username = displayName ?? (email.split("@")[0] || "Player");
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        display_name: username,
        city: "Almaty",
        avatar_url: null,
        level: 1,
        rating: 1200,
        wins: 0,
        losses: 0,
        favorite_vibe_room: "grass-picnic",
        subscription_status: "free",
        trial_started_at: null,
        trial_ends_at: null,
        pro_until: null
      },
      { onConflict: "id" }
    )
    .select("*")
    .maybeSingle();

  if (insertError || !inserted) {
    return {
      id: userId,
      email,
      username,
      city: "Almaty",
      avatar_url: null,
      level: 1,
      rating: 1200,
      wins: 0,
      losses: 0,
      favorite_vibe_room: "grass-picnic",
      subscription_status: "free",
      trial_started_at: null,
      trial_ends_at: null,
      pro_until: null,
      created_at: new Date().toISOString()
    };
  }

  return normalizeProfileRow(inserted as Record<string, unknown>, userId, email);
}
