export type PlayerColor = "white" | "black";

export type BotPersonality = "Chill" | "Tactical" | "Aggressive";

export type MoveQualityLabel = "safe" | "neutral" | "risky" | "strong" | "blunder";

export type MatchQualityLabel = "Beginner" | "Solid" | "Strong" | "Tactical" | "Advanced";

export type MatchMode = "quick" | "bot" | "ranked" | "friend" | "tournament";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  city: string;
  avatarUrl?: string | null;
  pro: boolean;
  proUntil?: string | null;
  createdAt: string;
}

export type SubscriptionStatus = "free" | "trial" | "pro" | "expired";

export interface Profile {
  id: string;
  email: string;
  username: string;
  city: string;
  avatar_url?: string | null;
  playstyle?: string | null;
  level: number;
  rating: number;
  wins: number;
  losses: number;
  favorite_vibe_room?: string | null;
  subscription_status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  pro_until: string | null;
  created_at: string;
}

export interface SessionState {
  user: AppUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface RatingRecord {
  id: string;
  userId: string;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  rank: number;
  city: string;
}

export interface MatchRecord {
  id: string;
  mode: MatchMode;
  playerWhiteId: string | null;
  playerBlackId: string | null;
  botPersonality?: BotPersonality;
  roomId?: string | null;
  status: "waiting" | "active" | "finished";
  winnerId?: string | null;
  endedEarly?: boolean;
  forfeitBy?: PlayerColor | null;
  ratingDelta?: number;
  startedAt: string;
  finishedAt?: string | null;
}

export interface MoveRecord {
  id: string;
  matchId: string;
  player: PlayerColor;
  from: number | "bar";
  to: number | "off";
  die: number;
  createdAt: string;
  hit: boolean;
  borneOff: boolean;
}

export interface StatisticRecord {
  id: string;
  userId: string;
  matchesPlayed: number;
  quickWins: number;
  bestStreak: number;
  averageMoveQuality: number;
  favoriteMode: MatchMode;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  city: string;
  rating: number;
  wins: number;
  streak: number;
  rank: number;
}

export interface AchievementRecord {
  id: string;
  userId: string;
  title: string;
  description: string;
  unlockedAt?: string | null;
}

export interface PurchaseRecord {
  id: string;
  userId: string;
  plan: "pro" | "pro-trial" | "tournament-pack";
  amount: number;
  currency: "USD";
  status: "pending" | "paid" | "failed" | "trial";
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  createdAt: string;
}

export interface AIAnalysisRecord {
  id: string;
  matchId: string;
  moveId?: string | null;
  moveQuality: number;
  riskScore: number;
  aggressionScore: number;
  explanation: string;
  bestMoveRecommendation: string;
  createdAt: string;
}

export type PointOccupant = {
  color: PlayerColor;
  count: number;
};

export type PointIndex = number;

export interface CheckerMove {
  from: number | "bar";
  to: number | "off";
  die: number;
  hit: boolean;
  borneOff: boolean;
}

export interface GamePoint {
  index: PointIndex;
  occupant: PointOccupant | null;
}

export interface GameDice {
  available: number[];
  lastRoll: [number, number] | null;
  used: number[];
}

export interface GamePlayerState {
  color: PlayerColor;
  bar: number;
  borneOff: number;
}

export interface GameState {
  points: Array<PointOccupant | null>;
  players: Record<PlayerColor, GamePlayerState>;
  currentPlayer: PlayerColor;
  playerColor: PlayerColor;
  roomId: string | null;
  dice: GameDice;
  selectedPoint: number | "bar" | null;
  legalMoves: CheckerMove[];
  lastMove: CheckerMove | null;
  coachMessage: string | null;
  winner: PlayerColor | null;
  turnCount: number;
  status: "idle" | "rolling" | "moving" | "bot-thinking" | "finished";
  botPersonality: BotPersonality;
}

export interface MoveAnalysis {
  moveQuality: number;
  riskScore: number;
  aggressionScore: number;
  qualityLabel: MoveQualityLabel;
  hint: string;
  explanation: string;
  bestMoveRecommendation: string;
  facts: MoveFacts;
}

export interface MoveFacts {
  exposedBefore: number;
  exposedAfter: number;
  protectedBefore: number;
  protectedAfter: number;
  blockedBefore: number;
  blockedAfter: number;
  threatCount: number;
  forwardProgress: number;
  moveDistance: number;
}
