import { HOME_BOARD } from "@/lib/backgammon/constants";
import {
  boardControlScore,
  countOpponentAttackers,
  countPips,
  getCandidateMoves,
  getOpponent,
  getPlayerDirection,
  getMovePressure
} from "@/lib/backgammon/engine";
import { getCoachFlavor } from "@/lib/vibe-rooms";
import type {
  BotPersonality,
  CheckerMove,
  GameState,
  MatchMode,
  MatchQualityLabel,
  MoveAnalysis,
  MoveFacts,
  MoveQualityLabel,
  PlayerColor
} from "@/lib/types";

export interface MatchAnalysisMoveRecord {
  move: CheckerMove;
  player: PlayerColor;
  analysis: MoveAnalysis;
}

export interface EndgameAnalysis {
  score: number;
  qualityLabel: MatchQualityLabel;
  winnerName: string;
  resultLabel: string;
  summary: string;
  stats: {
    safeMoves: number;
    riskyMoves: number;
    successfulHits: number;
    blunders: number;
    defenseRating: number;
    aggressionRating: number;
    blockedPoints: number;
  };
}

export function analyzeMove(
  before: GameState,
  move: CheckerMove,
  after: GameState,
  options?: { botPersonality?: BotPersonality; vibeRoom?: string | null }
): MoveAnalysis {
  const player = before.currentPlayer;
  const opponent = getOpponent(player);
  const facts = collectMoveFacts(before, after, move, player, opponent);
  const pipSwing = countPips(before, opponent) - countPips(after, opponent);
  const pressure = getMovePressure(before, move);
  const controlDelta = boardControlScore(after, player) - boardControlScore(before, player);
  const safetyDelta = facts.protectedAfter - facts.protectedBefore;
  const exposureDelta = facts.exposedAfter - facts.exposedBefore;
  const threatPenalty = facts.threatCount > 0 ? 0.15 + Math.min(0.2, facts.threatCount * 0.05) : 0;
  const aggressionBase =
    0.26 +
    (move.hit ? 0.22 : 0) +
    (move.borneOff ? 0.16 : 0) +
    Math.max(0, facts.forwardProgress) / 8 +
    Math.max(0, pipSwing) / 90;
  const riskScore = round01(Math.max(0, pressure + threatPenalty + Math.max(0, exposureDelta) * 0.16 - Math.max(0, safetyDelta) * 0.08));
  const aggressionScore = round01(Math.max(0, Math.min(1, aggressionBase - Math.max(0, facts.threatCount) * 0.04)));
  const moveQuality = round01(
    Math.max(
      0,
      0.44 +
        pipSwing / 70 +
        controlDelta / 12 +
        Math.max(0, safetyDelta) * 0.1 +
        (move.hit ? 0.16 : 0) +
        (move.borneOff ? 0.22 : 0) -
        riskScore * 0.34 -
        Math.max(0, exposureDelta) * 0.14
    )
  );
  const qualityLabel = classifyMoveQuality(move, facts, moveQuality, riskScore, aggressionScore);

  return {
    moveQuality,
    riskScore,
    aggressionScore,
    qualityLabel,
    hint: buildMoveHint(before, move, after, facts, moveQuality, riskScore, aggressionScore, qualityLabel),
    explanation: explain(before, move, after, facts, moveQuality, riskScore, aggressionScore, options?.botPersonality, options?.vibeRoom),
    bestMoveRecommendation: recommend(before, move, after, facts, options?.botPersonality, options?.vibeRoom),
    facts
  };
}

export function chooseCoachMove(state: GameState, moves = getCandidateMoves(state)) {
  if (moves.length === 0) {
    return null;
  }

  const scored = moves
    .map((move) => ({
      move,
      score: scoreMove(state, move)
    }))
    .sort((left, right) => right.score - left.score);

  return scored[0]?.move ?? null;
}

export function buildEndgameAnalysis(
  moveHistory: MatchAnalysisMoveRecord[],
  game: GameState,
  playerColor: PlayerColor,
  matchMode: MatchMode
): EndgameAnalysis {
  const analyses = moveHistory.map((entry) => entry.analysis);
  const moveCount = Math.max(1, analyses.length);
  const safeMoves = analyses.filter((analysis) => analysis.qualityLabel === "safe" || analysis.qualityLabel === "strong").length;
  const riskyMoves = analyses.filter((analysis) => analysis.qualityLabel === "risky" || analysis.qualityLabel === "blunder").length;
  const successfulHits = moveHistory.filter((entry) => entry.move.hit).length;
  const blunders = analyses.filter((analysis) => analysis.qualityLabel === "blunder").length;
  const blockedPoints = analyses.filter((analysis) => analysis.facts.blockedAfter > analysis.facts.blockedBefore).length;
  const averageDefense = average(
    analyses.map((analysis) => clamp01(1 - analysis.riskScore * 0.72 + Math.min(0.25, analysis.facts.protectedAfter / 20) + (analysis.qualityLabel === "strong" ? 0.08 : 0)))
  );
  const averageAggression = average(analyses.map((analysis) => analysis.aggressionScore));
  const exposedPressure = average(analyses.map((analysis) => Math.min(1, analysis.facts.threatCount / 2 + Math.max(0, analysis.facts.exposedAfter - analysis.facts.exposedBefore) * 0.45)));

  const score = roundNumber(
    clamp(
      0,
      10,
      4.4 +
        safeMoves / moveCount * 2.1 +
        successfulHits / moveCount * 1.15 +
        blockedPoints / moveCount * 0.95 +
        averageDefense * 1.35 +
        averageAggression * 0.65 -
        riskyMoves / moveCount * 1.65 -
        blunders / moveCount * 1.25 -
        exposedPressure * 0.95
    )
  );

  const qualityLabel: MatchQualityLabel =
    score < 4.5 ? "Beginner" : score < 6.2 ? "Solid" : score < 7.8 ? "Strong" : score < 9 ? "Tactical" : "Advanced";

  return {
    score,
    qualityLabel,
    winnerName: getWinnerName(game, playerColor, matchMode),
    resultLabel: game.winner === playerColor ? "Victory" : "Defeat",
    summary: buildSummary({
      safeMoves,
      riskyMoves,
      successfulHits,
      blunders,
      averageDefense,
      averageAggression,
      exposedPressure,
      blockedPoints,
      moveCount
    }),
    stats: {
      safeMoves,
      riskyMoves,
      successfulHits,
      blunders,
      defenseRating: roundNumber(averageDefense * 10),
      aggressionRating: roundNumber(averageAggression * 10),
      blockedPoints
    }
  };
}

function classifyMoveQuality(
  move: CheckerMove,
  facts: MoveFacts,
  moveQuality: number,
  riskScore: number,
  aggressionScore: number
): MoveQualityLabel {
  if (riskScore >= 0.78 || (facts.threatCount > 0 && moveQuality < 0.36 && facts.exposedAfter > facts.exposedBefore)) {
    return "blunder";
  }
  if (riskScore >= 0.55 || facts.exposedAfter > facts.exposedBefore) {
    return "risky";
  }
  if (move.hit || move.borneOff || facts.blockedAfter > facts.blockedBefore || facts.protectedAfter > facts.protectedBefore + 1) {
    return "strong";
  }
  if (moveQuality >= 0.58 && riskScore < 0.32) {
    return "safe";
  }
  if (aggressionScore >= 0.65 && facts.forwardProgress > 0) {
    return "strong";
  }
  return "neutral";
}

function buildMoveHint(
  before: GameState,
  move: CheckerMove,
  after: GameState,
  facts: MoveFacts,
  moveQuality: number,
  riskScore: number,
  aggressionScore: number,
  qualityLabel: MoveQualityLabel
) {
  const player = before.currentPlayer;
  const movedToCenter = typeof move.to === "number" && move.to >= 6 && move.to <= 17;

  if (facts.threatCount > 0 && facts.exposedAfter > facts.exposedBefore) {
    return "Risk detected.";
  }
  if (facts.exposedAfter > facts.exposedBefore) {
    return "You exposed a checker.";
  }
  if (move.hit || facts.blockedAfter > facts.blockedBefore) {
    return "Strong block.";
  }
  if (facts.protectedAfter > facts.protectedBefore && HOME_BOARD[player].includes(typeof move.to === "number" ? move.to : -1)) {
    return "Strong defensive structure.";
  }
  if (facts.protectedAfter > facts.protectedBefore || facts.exposedAfter < facts.exposedBefore) {
    return movedToCenter ? "Good control of the center." : "Safe position.";
  }
  if (aggressionScore >= 0.58 || moveQuality >= 0.62 || qualityLabel === "strong") {
    return "Aggressive move.";
  }
  if (movedToCenter) {
    return "Good control of the center.";
  }
  return "Safe move.";
}

function explain(
  before: GameState,
  move: CheckerMove,
  after: GameState,
  facts: MoveFacts,
  quality: number,
  risk: number,
  aggression: number,
  personality?: BotPersonality,
  vibeRoom?: string | null
) {
  const room = getCoachFlavor(vibeRoom);
  const prefix = room.prefix;

  if (move.borneOff) {
    return `${prefix}: strong because it brought a checker home cleanly.`;
  }
  if (move.hit) {
    return `${prefix}: strong because it hit the opponent and kept tempo.`;
  }
  if (facts.threatCount > 0 && facts.exposedAfter > facts.exposedBefore) {
    return `${prefix}: risky because this checker became exposed and can be hit next turn.`;
  }
  if (facts.exposedAfter > facts.exposedBefore) {
    return `${prefix}: risky because you left a blot.`;
  }
  if (facts.blockedAfter > facts.blockedBefore) {
    return `${prefix}: strong because it blocked opponent movement.`;
  }
  if (facts.protectedAfter > facts.protectedBefore && facts.exposedAfter <= facts.exposedBefore) {
    return `${prefix}: safe because it improved structure and reduced exposure.`;
  }
  if (aggression >= 0.62 && facts.forwardProgress > 0) {
    const tone =
      personality === "Aggressive"
        ? "aggressive because it forced the pace."
        : personality === "Chill"
          ? "active, but still controlled."
          : "tactical and forward-moving.";
    return `${prefix}: ${tone}`;
  }
  if (quality >= 0.65) {
    return `${prefix}: balanced because it improves the board without overextending.`;
  }
  const target = move.to === "off" ? "bearing off" : `point ${move.to + 1}`;
  return `${prefix}: playable, but a cleaner line may exist around ${target}.`;
}

function recommend(
  before: GameState,
  move: CheckerMove,
  after: GameState,
  facts: MoveFacts,
  personality?: BotPersonality,
  vibeRoom?: string | null
) {
  const room = getCoachFlavor(vibeRoom);
  if (move.borneOff) {
    return `${room.intro} Keep using the biggest die that still bears off cleanly.`;
  }
  if (move.hit) {
    const base =
      personality === "Aggressive"
        ? "Press the attack if you can keep the point covered."
        : "If available, prioritize continuation that covers the hit point.";
    return `${room.suffix} ${base}`;
  }
  if (facts.exposedAfter > facts.exposedBefore) {
    const base =
      personality === "Chill"
        ? "If you have a quieter option, take it before you expose another blot."
        : "Try to secure the point or choose a safer builder.";
    return `${room.suffix} ${base}`;
  }
  if (facts.blockedAfter > facts.blockedBefore) {
    const base = "Keep building the block while the opponent has less room to move.";
    return `${room.suffix} ${base}`;
  }
  const player = before.currentPlayer;
  const homeBoard = player === "white" ? [0, 1, 2, 3, 4, 5] : [18, 19, 20, 21, 22, 23];
  const base =
    personality === "Aggressive"
      ? `Look for tempo that builds toward the ${homeBoard[2] + 1}-point or a sharp prime.`
      : `Look for a move that secures the ${homeBoard[2] + 1}-point or builds a prime.`;
  return `${room.suffix} ${base}`;
}

function scoreMove(state: GameState, move: CheckerMove) {
  const player = state.currentPlayer;
  const opponent = getOpponent(player);
  const target = move.to === "off" ? null : state.points[move.to];
  const sourceIndex = typeof move.from === "number" ? move.from : -1;
  const pipGain = move.from === "bar" || move.to === "off" ? 2 : Math.max(0, 6 - Math.abs(sourceIndex - move.to));
  const control = boardControlScore(state, player);
  const pressure = getMovePressure(state, move);
  const hit = move.hit ? 3 : 0;
  const bearOff = move.borneOff ? 4 : 0;
  const safety = target && target.color === opponent && target.count === 1 ? 1 : 0;

  return control + pipGain + hit + bearOff + safety - pressure;
}

function collectMoveFacts(before: GameState, after: GameState, move: CheckerMove, player: PlayerColor, opponent: PlayerColor): MoveFacts {
  const exposedBefore = countExposedCheckers(before, player);
  const exposedAfter = countExposedCheckers(after, player);
  const protectedBefore = countProtectedCheckers(before, player);
  const protectedAfter = countProtectedCheckers(after, player);
  const blockedBefore = countClosedPoints(before, player);
  const blockedAfter = countClosedPoints(after, player);
  const threatCount = countThreatenedCheckers(after, player);
  const direction = getPlayerDirection(player);
  const forwardProgress =
    move.from === "bar"
      ? move.die
      : move.to === "off"
        ? 6
        : typeof move.from === "number"
          ? Math.max(0, direction * (move.to - move.from))
          : 0;
  const moveDistance =
    move.from === "bar"
      ? move.die
      : move.to === "off"
        ? 0
        : typeof move.from === "number"
          ? Math.abs(move.to - move.from)
          : move.die;

  void opponent;

  return {
    exposedBefore,
    exposedAfter,
    protectedBefore,
    protectedAfter,
    blockedBefore,
    blockedAfter,
    threatCount,
    forwardProgress,
    moveDistance
  };
}

function countExposedCheckers(state: GameState, color: PlayerColor) {
  return state.points.reduce((total, occupant) => {
    if (!occupant || occupant.color !== color || occupant.count !== 1) {
      return total;
    }
    return total + 1;
  }, 0);
}

function countProtectedCheckers(state: GameState, color: PlayerColor) {
  return state.points.reduce((total, occupant) => {
    if (!occupant || occupant.color !== color || occupant.count < 2) {
      return total;
    }
    return total + occupant.count;
  }, 0);
}

function countClosedPoints(state: GameState, color: PlayerColor) {
  return state.points.reduce((total, occupant) => {
    if (!occupant || occupant.color !== color || occupant.count < 2) {
      return total;
    }
    return total + 1;
  }, 0);
}

function countThreatenedCheckers(state: GameState, color: PlayerColor) {
  const opponent = getOpponent(color);
  return state.points.reduce((total, occupant, index) => {
    if (!occupant || occupant.color !== color || occupant.count !== 1) {
      return total;
    }
    return total + (countOpponentAttackers(state, index, opponent) > 0 ? 1 : 0);
  }, 0);
}

function getWinnerName(game: GameState, playerColor: PlayerColor, matchMode: MatchMode) {
  if (game.winner === playerColor) {
    return "You";
  }
  if (matchMode === "bot") {
    return "Bot";
  }
  return "Opponent";
}

function buildSummary({
  safeMoves,
  riskyMoves,
  successfulHits,
  blunders,
  averageDefense,
  averageAggression,
  exposedPressure,
  blockedPoints,
  moveCount
}: {
  safeMoves: number;
  riskyMoves: number;
  successfulHits: number;
  blunders: number;
  averageDefense: number;
  averageAggression: number;
  exposedPressure: number;
  blockedPoints: number;
  moveCount: number;
}) {
  if (blunders >= 2 || riskyMoves > safeMoves) {
    return "Mistakes mostly came from leaving isolated checkers exposed.";
  }
  if (averageDefense >= 0.72 && safeMoves >= riskyMoves) {
    return "You played a balanced game with strong defensive positioning, but left several exposed checkers during midgame.";
  }
  if (averageAggression >= 0.68 && successfulHits >= 2) {
    return "You played aggressively and controlled tempo well, but took unnecessary risks near the end.";
  }
  if (blockedPoints >= 2 && safeMoves > 0) {
    return "You kept a steady shape and blocked the opponent at key moments, but some checker exposure still crept in.";
  }
  if (exposedPressure > 0.45) {
    return "Your position stayed active, but exposed checkers kept giving the opponent counterplay.";
  }
  if (moveCount <= 3) {
    return "A short match with only a few critical decisions to judge.";
  }
  return "You found a steady rhythm and kept the position readable from move to move.";
}

function round01(value: number) {
  return clamp01(Math.round(value * 100) / 100);
}

function roundNumber(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(0, 1, value);
}
