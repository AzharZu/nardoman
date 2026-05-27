import { create } from "zustand";
import type { BotPersonality, CheckerMove, GameState, MatchMode, MoveAnalysis, PlayerColor } from "@/lib/types";
import {
  applyMove,
  createInitialGameState,
  endTurn,
  getLegalMovesForSource,
  getPlayableMoveSequences,
  isPlayableMove,
  rollDice,
  setRoll,
  settleTurn,
  serializeMove
} from "@/lib/backgammon/engine";
import { createMoveId } from "@/lib/backgammon/engine";
import { analyzeMove, buildEndgameAnalysis } from "@/lib/backgammon/analysis";
import { chooseBotTurn } from "@/lib/backgammon/bot";
import { createMatchHistoryEntry, saveMatchToHistory } from "@/lib/data/match-history";
import { useAuthStore } from "@/store/auth-store";
import { useProfileStore } from "@/store/profile-store";

const FORFEIT_RATING_PENALTY = 25;

export interface MoveHistoryEntry {
  id: string;
  move: CheckerMove;
  analysis: MoveAnalysis;
  notation: string;
  player: GameState["currentPlayer"];
  createdAt: string;
}

export interface StoreSnapshot {
  game: GameState;
  matchMode: MatchMode;
  matchId: string;
  playerColor: PlayerColor;
  roomId: string | null;
  botThinking: boolean;
  moveHistory: MoveHistoryEntry[];
  activeAnalysis: MoveAnalysis | null;
  matchSaved: boolean;
  endedEarly: boolean;
  forfeitBy: PlayerColor | null;
  ratingDelta: number;
}

interface GameStore extends StoreSnapshot {
  opponentId: string | null;
  opponentName: string | null;
  startNewMatch: (
    mode?: MatchMode,
    personality?: BotPersonality,
    roomId?: string | null,
    playerColor?: PlayerColor,
    opponent?: { id?: string | null; name?: string | null }
  ) => void;
  setBotPersonality: (personality: BotPersonality) => void;
  setPlayerColor: (color: PlayerColor) => void;
  setActiveAnalysisById: (id: string | null) => void;
  roll: () => void;
  selectSource: (source: number | "bar" | null) => void;
  clearSelection: () => void;
  executeMove: (move: CheckerMove) => void;
  endCurrentTurn: () => void;
  forfeitMatch: () => void;
  runBotTurn: () => void;
  saveMatch: () => void;
  applySnapshot: (snapshot: Partial<StoreSnapshot>) => void;
}

function createMatchId() {
  return `match_${Math.random().toString(36).slice(2, 10)}`;
}

function isLocalTurn(state: GameStore) {
  if (state.matchMode === "friend") {
    return state.game.currentPlayer === state.playerColor;
  }
  if (state.matchMode === "bot") {
    return state.game.currentPlayer === "white";
  }
  return true;
}

function createHistoryEntry(move: CheckerMove, player: GameState["currentPlayer"], analysis: MoveAnalysis): MoveHistoryEntry {
  return {
    id: createMoveId(),
    move,
    analysis,
    notation: serializeMove(move),
    player,
    createdAt: new Date().toISOString()
  };
}

function getActiveVibeRoom() {
  return useProfileStore.getState().profile?.favorite_vibe_room ?? "grass-picnic";
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: createInitialGameState(),
  matchMode: "quick",
  matchId: createMatchId(),
  playerColor: "white",
  roomId: null,
  opponentId: null,
  opponentName: null,
  botThinking: false,
  moveHistory: [],
  activeAnalysis: null,
  matchSaved: false,
  endedEarly: false,
  forfeitBy: null,
  ratingDelta: 0,
  startNewMatch: (mode = "quick", personality = "Tactical", roomId = null, playerColor = "white", opponent = {}) => {
    const nextMatchId = mode === "friend" && roomId ? roomId : createMatchId();
    set(() => ({
      game: createInitialGameState(personality, playerColor, roomId),
      matchMode: mode,
      matchId: nextMatchId,
      playerColor,
      roomId,
      opponentId: opponent.id ?? null,
      opponentName: opponent.name ?? null,
      botThinking: false,
      moveHistory: [],
      activeAnalysis: null,
      matchSaved: false,
      endedEarly: false,
      forfeitBy: null,
      ratingDelta: 0
    }));
  },
  setBotPersonality: (personality) =>
    set((state) => ({
      game: { ...state.game, botPersonality: personality }
    })),
  setPlayerColor: (color) =>
    set((state) => ({
      playerColor: color,
      game: { ...state.game, playerColor: color }
    })),
  setActiveAnalysisById: (id) =>
    set((state) => {
      if (!id) {
        return { activeAnalysis: null };
      }
      const found = state.moveHistory.find((entry) => entry.id === id);
      return {
        activeAnalysis: found?.analysis ?? null
      };
    }),
  roll: () => {
    const { game, botThinking, matchMode } = get();
    if (botThinking || game.status === "finished" || game.status === "bot-thinking" || game.status === "rolling") return;
    if (matchMode === "bot" && game.currentPlayer === "black") return;
    if (!isLocalTurn(get())) return;
    if (game.dice.available.length > 0) return;
    const matchId = get().matchId;
    set({
      game: {
        ...game,
        status: "rolling",
        coachMessage: "Rolling the dice..."
      },
      activeAnalysis: null
    });
    window.setTimeout(() => {
      if (get().matchId !== matchId) {
        return;
      }
      const nextGame = setRoll(get().game, rollDice());
      set({
        game: {
          ...nextGame,
          coachMessage: "Pick a checker, then tap a glowing destination."
        }
      });
    }, 680);
  },
  selectSource: (source) => {
    const { game, matchMode } = get();
    if (game.status === "finished" || game.status === "bot-thinking" || game.status === "rolling" || game.dice.available.length === 0) {
      return;
    }
    if (matchMode === "bot" && game.currentPlayer === "black") {
      return;
    }
    if (!isLocalTurn(get())) return;
    if (source === "bar" && game.players[game.currentPlayer].bar === 0) {
      return;
    }
    if (typeof source === "number") {
      const point = game.points[source];
      if (!point || point.color !== game.currentPlayer) {
        return;
      }
    }
    const legalMoves = getLegalMovesForSource(game, source);
    set({
      game: {
        ...game,
        selectedPoint: source,
        legalMoves,
        coachMessage: legalMoves.length > 0 ? "Now tap one of the glowing legal destinations." : "That checker cannot move with the current dice."
      }
    });
  },
  clearSelection: () => {
    set((state) => ({
      game: {
        ...state.game,
        selectedPoint: null,
        legalMoves: []
      }
    }));
  },
  executeMove: (move) => {
    const { game, matchMode } = get();
    if (game.status === "finished" || game.status === "bot-thinking" || game.status === "rolling" || game.dice.available.length === 0) {
      return;
    }
    if (matchMode === "bot" && game.currentPlayer === "black") {
      return;
    }
    if (!isLocalTurn(get())) return;
    if (!isPlayableMove(game, move)) {
      return;
    }

    const before = game;
    const after: GameState = settleTurn(applyMove(game, move));
    const vibeRoom = getActiveVibeRoom();
    const analysis = analyzeMove(before, move, after, {
      botPersonality: before.botPersonality,
      vibeRoom
    });
    const entry = createHistoryEntry(move, game.currentPlayer, analysis);

    set({
      game: {
        ...after,
        coachMessage: analysis.hint
      },
      moveHistory: [entry, ...get().moveHistory].slice(0, 50),
      activeAnalysis: analysis
    });

    if (after.currentPlayer !== before.currentPlayer && after.status !== "finished" && get().matchMode === "bot" && after.currentPlayer === "black") {
      get().runBotTurn();
    }

    if (after.status === "finished" && after.winner) {
      get().saveMatch();
    }
  },
  endCurrentTurn: () => {
    const { game, matchMode } = get();
    if (game.status === "finished" || game.status === "bot-thinking" || game.status === "rolling") return;
    if (matchMode === "bot" && game.currentPlayer === "black") return;
    if (!isLocalTurn(get())) return;
    if (getPlayableMoveSequences(game).length > 0) {
      return;
    }
    const next = endTurn(game);
    set({
      game: next,
      activeAnalysis: null
    });
    if (get().matchMode === "bot" && next.currentPlayer === "black") {
      get().runBotTurn();
    }
  },
  forfeitMatch: () => {
    const { game, matchMode, playerColor, botThinking } = get();
    if (game.status === "finished" || game.status === "rolling" || game.status === "bot-thinking" || botThinking) {
      return;
    }

    const currentUser = useAuthStore.getState().user;
    const isBotMatch = matchMode === "bot";
    const winner = playerColor === "white" ? "black" : "white";
    const ratingDelta = isBotMatch ? 0 : -FORFEIT_RATING_PENALTY;
    const nextGame: GameState = {
      ...game,
      status: "finished",
      winner,
      selectedPoint: null,
      legalMoves: [],
      coachMessage:
        isBotMatch
          ? "You ended the match early against the bot. No rating change."
          : `You resigned early. Rating reduced by ${Math.abs(ratingDelta)}.`
    };

    set({
      game: nextGame,
      endedEarly: true,
      forfeitBy: playerColor,
      ratingDelta,
      activeAnalysis: null
    });

    get().saveMatch();
  },
  runBotTurn: () => {
    const { game, matchId } = get();
    if (game.currentPlayer !== "black" || game.status === "finished" || game.status === "bot-thinking") {
      return;
    }
    if (get().botThinking) {
      return;
    }
    const beginPlayback = (initialState: GameState) => {
      const currentPlan = chooseBotTurn(initialState, getActiveVibeRoom());
      set({
        game: {
          ...initialState,
          status: "bot-thinking",
          coachMessage: currentPlan.commentary
        },
        botThinking: true
      });

      window.setTimeout(() => {
        if (get().matchId !== matchId) {
          set({ botThinking: false });
          return;
        }

        const current = get().game;
        if (current.currentPlayer !== "black" || current.status === "finished") {
          set({ botThinking: false });
          return;
        }

        let next: GameState = current;

        const finishTurn = () => {
          const settled = settleTurn(next);
          set({
            game: {
              ...settled,
              coachMessage:
                settled.status === "finished"
                  ? settled.winner === "black"
                    ? "Bot closed the match."
                    : "The match is over."
                  : "Back to your turn."
            },
            botThinking: false
          });

          if (settled.status === "finished" && settled.winner) {
            get().saveMatch();
          }
        };

        if (currentPlan.moves.length === 0) {
          window.setTimeout(() => {
            finishTurn();
          }, 280);
          return;
        }

        const playMove = (index: number) => {
          const move = currentPlan.moves[index];
          if (!move) {
            finishTurn();
            return;
          }

          const beforeMove = next;
          next = applyMove(beforeMove, move);
          const analysis = analyzeMove(beforeMove, move, next, {
            botPersonality: beforeMove.botPersonality,
            vibeRoom: getActiveVibeRoom()
          });

          set((state) => ({
            game: {
              ...next,
              status: "moving",
              coachMessage: analysis.hint
            },
            moveHistory: [
              createHistoryEntry(move, beforeMove.currentPlayer, analysis),
              ...state.moveHistory
            ].slice(0, 50),
            activeAnalysis: analysis
          }));

          window.setTimeout(() => {
            if (get().matchId !== matchId) {
              set({ botThinking: false });
              return;
            }
            if (index + 1 < currentPlan.moves.length) {
              playMove(index + 1);
              return;
            }
            finishTurn();
          }, 420);
        };

        playMove(0);
      }, Math.max(currentPlan.thinkingMs, 500));
    };

    if (game.dice.available.length === 0) {
      set({
        botThinking: true,
        game: {
          ...game,
          status: "rolling",
          coachMessage: "Bot is rolling the dice..."
        }
      });

      window.setTimeout(() => {
        if (get().matchId !== matchId) {
          set({ botThinking: false });
          return;
        }
        const rolled = setRoll(get().game, rollDice());
        beginPlayback(rolled);
      }, 720);
      return;
    }

    beginPlayback(game);
  },
  saveMatch: () => {
    const {
      game,
      matchMode,
      matchId,
      moveHistory,
      matchSaved,
      playerColor,
      roomId,
      opponentId,
      opponentName,
      endedEarly,
      forfeitBy,
      ratingDelta
    } = get();
    if (matchSaved || game.status !== "finished" || !game.winner) return;

    const profileStore = useProfileStore.getState();
    const currentUser = useAuthStore.getState().user;
    const profile = profileStore.profile;
    const vibeRoom = profile?.favorite_vibe_room ?? "Grass Picnic";
    const resolvedOpponentName =
      opponentName ??
      (matchMode === "bot"
        ? `${game.botPersonality} Bot`
        : matchMode === "friend"
          ? "Friend"
          : "Local Opponent");
    const matchAnalysis = buildEndgameAnalysis(
      [...moveHistory].reverse().map((historyItem) => ({
        move: historyItem.move,
        player: historyItem.player,
        analysis: historyItem.analysis
      })),
      game,
      playerColor,
      matchMode
    );
    const entry = createMatchHistoryEntry({
      matchId,
      matchMode,
      winner: game.winner,
      moveCount: moveHistory.length,
      turnCount: game.turnCount,
      botPersonality: game.botPersonality,
      playerColor,
      vibeRoom,
      roomId,
      endedEarly,
      forfeitBy,
      ratingDelta,
      opponentId,
      opponentName: resolvedOpponentName,
      aiCoachSummary: endedEarly
        ? matchMode === "bot"
          ? "You ended the match early against the bot. No rating change."
          : "You resigned early. Rating was reduced."
        : matchAnalysis.summary
    });

    saveMatchToHistory(
      entry,
      [...moveHistory].reverse().map((historyItem) => ({
        id: historyItem.id,
        player: historyItem.player,
        move: historyItem.move,
        notation: historyItem.notation,
        createdAt: historyItem.createdAt
      }))
    );

    if (currentUser) {
      const isWinner = game.winner === playerColor;
      const nextWins = (profile?.wins ?? 0) + (isWinner ? 1 : 0);
      const nextLosses = (profile?.losses ?? 0) + (isWinner ? 0 : 1);
      const nextRating = Math.max(0, (profile?.rating ?? 1200) + (ratingDelta ?? 0));
      void profileStore.updateProfile(currentUser.id, currentUser.email, {
        wins: nextWins,
        losses: nextLosses,
        rating: nextRating
      });
    }
    set({ matchSaved: true });
  },
  applySnapshot: (snapshot) => {
    set((state) => ({
      ...state,
      ...snapshot,
      game: snapshot.game ? { ...snapshot.game, playerColor: state.playerColor } : state.game,
      moveHistory: snapshot.moveHistory ?? state.moveHistory
    }));
  }
}));

export function useLegalMoves() {
  return useGameStore((state) => state.game.legalMoves);
}

export function useSelectedPoint() {
  return useGameStore((state) => state.game.selectedPoint);
}

export function useActiveAnalysis() {
  return useGameStore((state) => state.activeAnalysis);
}

export function useMatchSummary() {
  return useGameStore((state) => ({
    mode: state.matchMode,
    winner: state.game.winner,
    turnCount: state.game.turnCount,
    currentPlayer: state.game.currentPlayer,
    status: state.game.status,
    playerColor: state.playerColor
  }));
}
