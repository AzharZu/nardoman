import type {
  AchievementRecord,
  LeaderboardEntry,
  MatchRecord,
  MoveRecord,
  PurchaseRecord,
  Profile,
  StatisticRecord
} from "@/lib/types";

export type DatabaseSchema = {
  profiles: Profile;
  matches: MatchRecord;
  moves: MoveRecord;
  statistics: StatisticRecord;
  leaderboard_entries: LeaderboardEntry;
  achievements: AchievementRecord;
  purchases: PurchaseRecord;
};

export type TableName = keyof DatabaseSchema;

export interface Repository<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  insert(record: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
}
