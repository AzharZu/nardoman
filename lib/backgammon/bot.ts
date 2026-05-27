import { analyzeMove } from "@/lib/backgammon/analysis";
import {
  applyMove,
  buildMovesFromDice,
  createInitialGameState,
  getCandidateMoves
} from "@/lib/backgammon/engine";
import type { BotPersonality, CheckerMove, GameState } from "@/lib/types";

const PERSONALITY_WEIGHTS: Record<BotPersonality, { hit: number; safety: number; aggression: number; risk: number }> = {
  Aggressive: { hit: 2.8, safety: 0.7, aggression: 1.6, risk: 0.7 },
  Chill: { hit: 1.1, safety: 1.7, aggression: 0.6, risk: 1.5 },
  Tactical: { hit: 1.8, safety: 1.2, aggression: 1, risk: 1 }
};

export interface BotTurnPlan {
  moves: CheckerMove[];
  thinkingMs: number;
  commentary: string;
}

export function chooseBotTurn(state: GameState, vibeRoom?: string | null): BotTurnPlan {
  const sequences = buildMovesFromDice(state);
  if (sequences.length === 0) {
    return {
      moves: [],
      thinkingMs: 650,
      commentary: botOpeningLine(state.botPersonality, "no legal move", vibeRoom)
    };
  }

  const weights = PERSONALITY_WEIGHTS[state.botPersonality];
  const scored = sequences.map((sequence) => {
    const analysis = scoreSequence(state, sequence, weights, vibeRoom);
    return {
      sequence,
      ...analysis
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const topSlice = scored.slice(0, Math.min(3, scored.length));
  const choice = weightedPick(topSlice.length > 0 ? topSlice : scored, state.botPersonality);
  const commentary = buildBotCommentary(choice.sequence, state.botPersonality, choice.hitCount, choice.riskScore, vibeRoom);

  return {
    moves: choice.sequence,
    thinkingMs: 550 + Math.floor(Math.random() * 700),
    commentary
  };
}

function scoreSequence(
  state: GameState,
  sequence: CheckerMove[],
  weights: { hit: number; safety: number; aggression: number; risk: number },
  vibeRoom?: string | null
) {
  let current = state;
  let combinedQuality = 0;
  let combinedRisk = 0;
  let combinedAggression = 0;
  let hitCount = 0;
  let safetyScore = 0;
  let blotExposure = 0;

  for (const move of sequence) {
    const beforeMove = current;
    current = applyMove(beforeMove, move);
    const analysis = analyzeMove(beforeMove, move, current, { botPersonality: state.botPersonality, vibeRoom });
    combinedQuality += analysis.moveQuality;
    combinedRisk += analysis.riskScore;
    combinedAggression += analysis.aggressionScore;
    if (move.hit) {
      hitCount += 1;
    }
    if (move.to !== "off") {
      const occupant = current.points[move.to];
      if (occupant && occupant.color === state.currentPlayer) {
        safetyScore += occupant.count >= 2 ? 1 : 0.15;
        if (occupant.count === 1) {
          blotExposure += 1;
        }
      }
    }
  }

  let score = 0;

  for (const move of sequence) {
    score += move.hit ? weights.hit : 0;
    score += move.borneOff ? 1.8 : 0;
    score += move.to === "off" ? 1.2 : 0;
    if (typeof move.to === "number") {
      const occupant = current.points[move.to];
      if (occupant && occupant.color === state.currentPlayer && occupant.count >= 2) {
        score += weights.safety;
      }
      if (occupant && occupant.color === state.currentPlayer && occupant.count === 1) score -= 0.8;
    }
  }

  const averageQuality = combinedQuality / sequence.length;
  const averageRisk = combinedRisk / sequence.length;
  const averageAggression = combinedAggression / sequence.length;

  score += averageQuality * 2;
  score -= averageRisk * weights.risk;
  score += averageAggression * weights.aggression;
  score += hitCount > 0 ? weights.hit : 0;
  score += safetyScore * weights.safety;
  score -= blotExposure * 0.8 * weights.risk;
  score += sequence.length > 1 ? 0.4 : 0;
  score += randomRange(0, 0.18);

  return {
    score,
    hitCount,
    riskScore: averageRisk
  };
}

export function getBotPreviewState(personality: BotPersonality = "Tactical") {
  const state = createInitialGameState(personality);
  return getCandidateMoves(state);
}

function weightedPick(
  pool: Array<ReturnType<typeof scoreSequence> & { sequence: CheckerMove[] }>,
  personality: BotPersonality
) {
  const bias =
    personality === "Aggressive"
      ? [0.58, 0.27, 0.15]
      : personality === "Chill"
        ? [0.2, 0.34, 0.46]
        : [0.42, 0.33, 0.25];
  const threshold = Math.random();
  const first = pool[0];
  const second = pool[1] ?? first;
  const third = pool[2] ?? second;
  if (threshold < bias[0]) return first;
  if (threshold < bias[0] + bias[1]) return second;
  return third;
}

function buildBotCommentary(
  sequence: CheckerMove[],
  personality: BotPersonality,
  hitCount: number,
  riskScore: number,
  vibeRoom?: string | null
) {
  const opener = botOpeningLine(personality, sequence.length === 0 ? "no legal move" : "a line", vibeRoom);
  if (sequence.length === 0) {
    return opener;
  }

  const firstMove = sequence[0];
  const moveLabel = formatMove(firstMove);
  const closing =
    personality === "Aggressive"
      ? hitCount > 0
        ? "It keeps pressure on."
        : riskScore > 0.45
          ? "Still worth the tempo."
          : "Keeps the attack moving."
      : personality === "Chill"
        ? riskScore > 0.5
          ? "Still a little loose, but it's calm and playable."
          : "A calm line that keeps the position tidy."
        : riskScore > 0.45
          ? "There is some counterplay, but it improves the board."
          : "The structure stays solid.";

  return `${opener} ${moveLabel}. ${closing}`;
}

function botOpeningLine(personality: BotPersonality, mode: "no legal move" | "a line", vibeRoom?: string | null) {
  const roomLabel = vibeRoom === "zen-garden" ? "Zen Garden" : vibeRoom === "neon-city" ? "Neon City" : null;
  if (mode === "no legal move") {
    const roomPrefix = roomLabel ? `${roomLabel}: ` : "";
    return personality === "Aggressive"
      ? `${roomPrefix}No forcing shot is available, so the bot is passing cleanly.`
      : personality === "Chill"
        ? `${roomPrefix}Nothing urgent is on the board, so the bot is taking the quiet pass.`
        : `${roomPrefix}No legal continuation is available, so the bot is passing.`;
  }

  if (personality === "Aggressive") {
    return roomLabel ? `${roomLabel}: The bot is pushing for tempo.` : "The bot is pushing for tempo.";
  }
  if (personality === "Chill") {
    return roomLabel ? `${roomLabel}: The bot is choosing the calmest stable line.` : "The bot is choosing the calmest stable line.";
  }
  return roomLabel ? `${roomLabel}: The bot is looking for the most balanced line.` : "The bot is looking for the most balanced line.";
}

function formatMove(move: CheckerMove) {
  const from = move.from === "bar" ? "bar" : `p${move.from + 1}`;
  const to = move.to === "off" ? "off" : `p${move.to + 1}`;
  return `${from} → ${to}`;
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}
