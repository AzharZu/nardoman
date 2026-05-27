import type { BotPersonality, CheckerMove, MatchMode, PlayerColor } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { useProfileStore } from "@/store/profile-store";

const STORAGE_KEY = "backgammon-rush-match-history";

export interface MatchHistoryEntry {
  id: string;
  userId?: string | null;
  matchId: string;
  opponentType: "bot" | "local" | "friend";
  opponentId?: string | null;
  opponentName?: string | null;
  result: "win" | "loss";
  score: string;
  moves: number;
  vibeRoom: string;
  date: string;
  aiCoachSummary: string;
  botPersonality?: BotPersonality;
  matchMode: MatchMode;
  playerColor: PlayerColor;
  roomId?: string | null;
  endedEarly?: boolean;
  forfeitBy?: PlayerColor | null;
  ratingDelta?: number;
  whitePlayerName?: string | null;
  blackPlayerName?: string | null;
}

export interface RecordedMove {
  id: string;
  player: PlayerColor;
  move: CheckerMove;
  notation: string;
  createdAt?: string;
}

export function saveMatchToHistory(entry: MatchHistoryEntry, moves: RecordedMove[] = []) {
  const supabase = createSupabaseBrowserClient();
  const currentUser = useAuthStore.getState().user;
  const currentProfile = useProfileStore.getState().profile;
  const selfName = currentProfile?.username ?? currentUser?.displayName ?? "Player";
  const opponentName =
    entry.opponentName ??
    (entry.opponentType === "bot"
      ? `${entry.botPersonality ?? "Bot"} Bot`
      : entry.opponentType === "local"
        ? "Local Opponent"
        : "Friend");
  const withUser = {
    ...entry,
    userId: currentUser?.id ?? entry.userId ?? null,
    opponentName,
    whitePlayerName: entry.whitePlayerName ?? (entry.playerColor === "white" ? selfName : opponentName),
    blackPlayerName: entry.blackPlayerName ?? (entry.playerColor === "black" ? selfName : opponentName)
  };

  if (typeof window !== "undefined") {
    const existing = loadMatchHistory();
    const updated = [withUser, ...existing]
      .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 50);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  if (!supabase || !currentUser) {
    return;
  }

  void supabase
    .from("matches")
    .upsert({
      id: withUser.matchId,
      mode: withUser.matchMode,
      player_white_id: withUser.playerColor === "white" ? currentUser.id : withUser.opponentId ?? null,
      player_black_id: withUser.playerColor === "black" ? currentUser.id : withUser.opponentId ?? null,
      bot_personality: withUser.botPersonality ?? null,
      room_id: withUser.roomId ?? null,
      status: "finished",
      winner_id: withUser.result === "win" ? currentUser.id : null,
      ended_early: withUser.endedEarly ?? false,
      forfeit_by: withUser.forfeitBy ?? null,
      rating_delta: withUser.ratingDelta ?? 0,
      started_at: new Date(withUser.date).toISOString(),
      finished_at: new Date(withUser.date).toISOString()
    })
    .then(async ({ error }) => {
      if (error) {
        console.error("Failed to save match to Supabase:", error);
        return;
      }

      if (moves.length === 0) return;

      const payload = moves.map((record) => ({
        id: record.id,
        match_id: withUser.matchId,
        player: record.player,
        from_point: typeof record.move.from === "number" ? String(record.move.from) : "bar",
        to_point: record.move.to === "off" ? "off" : String(record.move.to),
        die: record.move.die,
        hit: record.move.hit,
        borne_off: record.move.borneOff,
        created_at: record.createdAt ?? new Date(withUser.date).toISOString()
      }));

      const { error: moveError } = await supabase.from("moves").upsert(payload);
      if (moveError) {
        console.error("Failed to save moves to Supabase:", moveError);
      }
    });
}

export function loadMatchHistory(): MatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MatchHistoryEntry[];
    return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export function createMatchHistoryEntry({
  matchId,
  matchMode,
  winner,
  moveCount,
  turnCount,
  botPersonality,
  playerColor,
  vibeRoom = "Grass Picnic",
  roomId = null,
  aiCoachSummary,
  endedEarly = false,
  forfeitBy = null,
  ratingDelta = 0,
  opponentId = null,
  opponentName = null
}: {
  matchId: string;
  matchMode: MatchMode;
  winner: PlayerColor | null;
  moveCount: number;
  turnCount: number;
  botPersonality?: BotPersonality;
  playerColor: PlayerColor;
  vibeRoom?: string;
  roomId?: string | null;
  aiCoachSummary?: string;
  endedEarly?: boolean;
  forfeitBy?: PlayerColor | null;
  ratingDelta?: number;
  opponentId?: string | null;
  opponentName?: string | null;
}): MatchHistoryEntry {
  const opponentType: "bot" | "local" | "friend" =
    matchMode === "bot" ? "bot" : matchMode === "friend" ? "friend" : "local";
  const result: "win" | "loss" = winner === playerColor ? "win" : "loss";

  return {
    id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: null,
    matchId,
    opponentType,
    opponentId,
    opponentName:
      opponentName ??
      (opponentType === "bot"
        ? `${botPersonality ?? "Bot"} Bot`
        : opponentType === "local"
          ? "Local Opponent"
          : "Friend"),
    result,
    score:
      endedEarly && result === "win"
        ? `F-${Math.max(0, turnCount - 1)}`
        : endedEarly && result === "loss"
          ? `${Math.max(0, turnCount - 1)}-F`
          : result === "win"
            ? `${turnCount}-${Math.max(0, turnCount - 1)}`
            : `${Math.max(0, turnCount - 1)}-${turnCount}`,
    moves: moveCount,
    vibeRoom,
    date: new Date().toISOString(),
    aiCoachSummary:
      aiCoachSummary ??
      (endedEarly
        ? result === "win"
          ? "The match ended early in your favor."
          : ratingDelta && ratingDelta < 0
            ? `You resigned early and took a ${Math.abs(ratingDelta)} rating hit.`
            : "You ended the match early."
        : result === "win"
          ? "You kept the pressure balanced and finished cleanly."
          : "You had promising tempo, but a safer structure would have helped."),
    botPersonality,
    matchMode,
    playerColor,
    roomId,
    endedEarly,
    forfeitBy,
    ratingDelta
  };
}

export function getMatchOpponentName(entry: MatchHistoryEntry) {
  if (entry.opponentName) {
    return entry.opponentName;
  }
  if (entry.opponentType === "bot") {
    return `${entry.botPersonality ?? "Bot"} Bot`;
  }
  if (entry.opponentType === "local") {
    return "Local Opponent";
  }
  return "Friend";
}

export function getMatchOpponentLabel(entry: MatchHistoryEntry) {
  return `vs ${getMatchOpponentName(entry)}`;
}
