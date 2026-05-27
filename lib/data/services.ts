import { createMemoryRepository } from "@/lib/data/mock-repository";
import type {
  AchievementRecord,
  AIAnalysisRecord,
  AppUser,
  LeaderboardEntry,
  MatchRecord,
  MoveRecord,
  PurchaseRecord,
  RatingRecord,
  StatisticRecord
} from "@/lib/types";

export const usersRepository = createMemoryRepository<AppUser>();
export const matchesRepository = createMemoryRepository<MatchRecord>();
export const movesRepository = createMemoryRepository<MoveRecord>();
export const ratingsRepository = createMemoryRepository<RatingRecord>();
export const statisticsRepository = createMemoryRepository<StatisticRecord>();
export const leaderboardRepository = createMemoryRepository<LeaderboardEntry>();
export const achievementsRepository = createMemoryRepository<AchievementRecord>();
export const purchasesRepository = createMemoryRepository<PurchaseRecord>();
export const aiAnalysisRepository = createMemoryRepository<AIAnalysisRecord>();

