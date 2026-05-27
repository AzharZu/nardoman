import type {
  AchievementRecord,
  LeaderboardEntry,
  StatisticRecord
} from "@/lib/types";

export const leaderboardSeed: LeaderboardEntry[] = [
  { id: "lb_1", userId: "u1", displayName: "Ayan", city: "Almaty", rating: 1842, wins: 64, streak: 7, rank: 1 },
  { id: "lb_2", userId: "u2", displayName: "Mira", city: "Astana", rating: 1786, wins: 58, streak: 4, rank: 2 },
  { id: "lb_3", userId: "u3", displayName: "Timur", city: "Shymkent", rating: 1754, wins: 51, streak: 5, rank: 3 },
  { id: "lb_4", userId: "u4", displayName: "Nika", city: "Bishkek", rating: 1712, wins: 47, streak: 6, rank: 4 },
  { id: "lb_5", userId: "u5", displayName: "Rustam", city: "Tashkent", rating: 1679, wins: 44, streak: 3, rank: 5 }
];

export const achievementSeed: AchievementRecord[] = [
  {
    id: "ach_1",
    userId: "u1",
    title: "Fast Starter",
    description: "Win three quick matches in a row.",
    unlockedAt: new Date().toISOString()
  },
  {
    id: "ach_2",
    userId: "u2",
    title: "Safe Builder",
    description: "Finish a match without leaving a blot for five turns.",
    unlockedAt: null
  }
];

export const statsSeed: StatisticRecord = {
  id: "stats_1",
  userId: "u1",
  matchesPlayed: 128,
  quickWins: 71,
  bestStreak: 9,
  averageMoveQuality: 0.72,
  favoriteMode: "quick"
};
