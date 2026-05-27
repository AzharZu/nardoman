import {
  CHECKERS_PER_PLAYER,
  DIRECTION,
  HOME_BOARD,
  OPPONENT,
  POINT_COUNT,
  STARTING_POINTS
} from "@/lib/backgammon/constants";
import type {
  CheckerMove,
  GameState,
  PlayerColor,
  PointOccupant
} from "@/lib/types";
import { createId } from "@/lib/utils";

export function createInitialGameState(
  botPersonality: GameState["botPersonality"] = "Tactical",
  playerColor: PlayerColor = "white",
  roomId: string | null = null
): GameState {
  const points: Array<PointOccupant | null> = Array.from({ length: POINT_COUNT }, () => null);
  for (const point of STARTING_POINTS) {
    points[point.index] = { color: point.color, count: point.count };
  }

  return {
    points,
    players: {
      white: { color: "white", bar: 0, borneOff: 0 },
      black: { color: "black", bar: 0, borneOff: 0 }
    },
    currentPlayer: "white",
    playerColor,
    roomId,
    dice: { available: [], lastRoll: null, used: [] },
    selectedPoint: null,
    legalMoves: [],
    lastMove: null,
    coachMessage: null,
    winner: null,
    turnCount: 1,
    status: "idle",
    botPersonality
  };
}

export function rollDice(): [number, number] {
  return [rollDie(), rollDie()];
}

export function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

export function setRoll(state: GameState, roll: [number, number]): GameState {
  const available = roll[0] === roll[1] ? [roll[0], roll[0], roll[0], roll[0]] : [...roll];
  return {
    ...state,
    dice: { available, lastRoll: roll, used: [] },
    selectedPoint: null,
    legalMoves: [],
    status: "moving" as const
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    points: state.points.map((point) => (point ? { ...point } : null)),
    players: {
      white: { ...state.players.white },
      black: { ...state.players.black }
    },
    playerColor: state.playerColor,
    roomId: state.roomId,
    dice: {
      available: [...state.dice.available],
      lastRoll: state.dice.lastRoll ? [...state.dice.lastRoll] : null,
      used: [...state.dice.used]
    },
    legalMoves: state.legalMoves.map((move) => ({ ...move })),
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    coachMessage: state.coachMessage
  };
}

export function getPlayerDirection(color: PlayerColor) {
  return DIRECTION[color];
}

export function getOpponent(color: PlayerColor) {
  return OPPONENT[color];
}

export function isPointOpenFor(color: PlayerColor, occupant: PointOccupant | null) {
  return !occupant || occupant.color === color || occupant.count === 1;
}

export function isBlockedPoint(state: GameState, color: PlayerColor, index: number) {
  const occupant = state.points[index];
  return Boolean(occupant && occupant.color !== color && occupant.count >= 2);
}

export function hasCheckersOnBar(state: GameState, color: PlayerColor) {
  return state.players[color].bar > 0;
}

export function allCheckersInHomeBoard(state: GameState, color: PlayerColor) {
  if (state.players[color].bar > 0) {
    return false;
  }
  return state.points.every((point, index) => {
    if (!point || point.color !== color) {
      return true;
    }
    return HOME_BOARD[color].includes(index);
  });
}

export function getDistanceToBearOff(color: PlayerColor, from: number) {
  return color === "white" ? from + 1 : POINT_COUNT - from;
}

export function canBearOff(state: GameState, color: PlayerColor, from: number, die: number) {
  if (!allCheckersInHomeBoard(state, color)) {
    return false;
  }
  const distance = getDistanceToBearOff(color, from);
  if (distance === die) {
    return true;
  }
  if (distance < die) {
    if (color === "white") {
      return HOME_BOARD.white.filter((point) => point > from).every((point) => {
        const occupant = state.points[point];
        return !(occupant && occupant.color === color);
      });
    }
    return HOME_BOARD.black.filter((point) => point > from).every((point) => {
      const occupant = state.points[point];
      return !(occupant && occupant.color === color);
    });
  }
  return false;
}

export function getEntryPointFromBar(color: PlayerColor, die: number) {
  return color === "white" ? POINT_COUNT - die : die - 1;
}

export function removeDie(available: number[], die: number) {
  const index = available.indexOf(die);
  if (index === -1) {
    return available;
  }
  return [...available.slice(0, index), ...available.slice(index + 1)];
}

export function getCandidateMoves(state: GameState, color = state.currentPlayer): CheckerMove[] {
  if (state.winner || state.status === "finished") {
    return [];
  }
  const moves: CheckerMove[] = [];
  const direction = getPlayerDirection(color);
  const dice = state.dice.available;

  if (dice.length === 0) {
    return moves;
  }

  if (hasCheckersOnBar(state, color)) {
    for (const die of dice) {
      const to = getEntryPointFromBar(color, die);
      if (to < 0 || to >= POINT_COUNT) continue;
      if (isBlockedPoint(state, color, to)) continue;
      const occupant = state.points[to];
      moves.push({
        from: "bar",
        to,
        die,
        hit: Boolean(occupant && occupant.color !== color && occupant.count === 1),
        borneOff: false
      });
    }
    return moves;
  }

  state.points.forEach((occupant, from) => {
    if (!occupant || occupant.color !== color) {
      return;
    }

    for (const die of dice) {
      const destination = from + direction * die;
      if (destination >= 0 && destination < POINT_COUNT) {
        if (isBlockedPoint(state, color, destination)) {
          continue;
        }
        const target = state.points[destination];
        moves.push({
          from,
          to: destination,
          die,
          hit: Boolean(target && target.color !== color && target.count === 1),
          borneOff: false
        });
        continue;
      }

      if (canBearOff(state, color, from, die)) {
        moves.push({
          from,
          to: "off",
          die,
          hit: false,
          borneOff: true
        });
      }
    }
  });

  return dedupeMoves(moves);
}

export function getLegalMovesForSource(state: GameState, source: number | "bar" | null) {
  if (source === null) {
    return [];
  }
  const preferredMoves = getPlayableMoveSequences(state)
    .map((sequence) => sequence[0])
    .filter((move): move is CheckerMove => Boolean(move) && move.from === source);

  return dedupeMoves(preferredMoves);
}

export function getLegalDestinations(state: GameState, source: number | "bar" | null) {
  return getLegalMovesForSource(state, source).map((move) => move.to);
}

export function dedupeMoves(moves: CheckerMove[]) {
  const seen = new Set<string>();
  return moves.filter((move) => {
    const key = `${move.from}-${move.to}-${move.die}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function applyMove(state: GameState, move: CheckerMove): GameState {
  const next = cloneState(state);
  const player = next.currentPlayer;
  const opponent = getOpponent(player);

  if (move.from === "bar") {
    next.players[player].bar -= 1;
  } else {
    const source = next.points[move.from];
    if (!source || source.color !== player) {
      return state;
    }
    if (source.count === 1) {
      next.points[move.from] = null;
    } else {
      next.points[move.from] = { ...source, count: source.count - 1 };
    }
  }

  if (move.to === "off") {
    next.players[player].borneOff += 1;
  } else {
    const destination = next.points[move.to];
    if (destination && destination.color !== player && destination.count === 1) {
      next.players[opponent].bar += 1;
      next.points[move.to] = { color: player, count: 1 };
    } else if (destination && destination.color === player) {
      next.points[move.to] = { color: player, count: destination.count + 1 };
    } else {
      next.points[move.to] = { color: player, count: 1 };
    }
  }

  next.dice.available = removeDie(next.dice.available, move.die);
  next.dice.used = [...next.dice.used, move.die];
  next.lastMove = move;
  next.selectedPoint = null;
  next.legalMoves = [];
  next.winner = getWinner(next);
  return next.winner
    ? ({ ...next, status: "finished" as const } satisfies GameState)
    : ({ ...next, status: "moving" as const } satisfies GameState);
}

export function maybeAutoAdvanceTurn(state: GameState) {
  if (state.dice.available.length === 0) {
    return endTurn(state);
  }
  const remaining = getCandidateMoves(state, state.currentPlayer);
  if (remaining.length === 0) {
    return endTurn(state);
  }
  return state;
}

export function endTurn(state: GameState): GameState {
  if (state.winner) {
    return { ...state, status: "finished" as const };
  }
  const nextPlayer = getOpponent(state.currentPlayer);
  return {
    ...state,
    currentPlayer: nextPlayer,
    selectedPoint: null,
    legalMoves: [],
    dice: { available: [], lastRoll: null, used: [] },
    status: "idle" as const,
    turnCount: state.turnCount + 1
  };
}

export function getWinner(state: GameState): PlayerColor | null {
  if (state.players.white.borneOff >= CHECKERS_PER_PLAYER) return "white";
  if (state.players.black.borneOff >= CHECKERS_PER_PLAYER) return "black";
  return null;
}

export function annotateMove(state: GameState, move: CheckerMove) {
  const before = cloneState(state);
  const after = applyMove(before, move);
  const player = before.currentPlayer;
  const opponent = getOpponent(player);
  const target = move.to === "off" ? null : after.points[move.to];

  return {
    before,
    after,
    move,
    hit: move.hit,
    borneOff: move.borneOff,
    exposedBlot: Boolean(
      move.to !== "off" &&
        target &&
        target.color === player &&
        target.count === 1 &&
        countOpponentAttackers(after, move.to, opponent) > 0
    ),
    pipGain: move.from === "bar" ? 0 : getDistanceToBearOff(player, move.from) - (move.to === "off" ? 0 : getDistanceToBearOff(player, move.to))
  };
}

export function serializeMove(move: CheckerMove) {
  return `${move.from}->${move.to} (d${move.die})`;
}

export function createMoveId() {
  return createId("move");
}

export function countPips(state: GameState, color: PlayerColor) {
  return state.points.reduce((total, occupant, index) => {
    if (!occupant || occupant.color !== color) return total;
    const distance = color === "white" ? index + 1 : POINT_COUNT - index;
    return total + distance * occupant.count;
  }, state.players[color].bar * 25);
}

export function getMovePressure(state: GameState, move: CheckerMove) {
  if (move.to === "off") return 0;
  const occupant = state.points[move.to];
  if (occupant && occupant.color === state.currentPlayer && occupant.count === 1) {
    return 0.6;
  }
  if (move.hit) return 0.1;
  return 0.3;
}

export function boardControlScore(state: GameState, color: PlayerColor) {
  return state.points.reduce((total, occupant, index) => {
    if (!occupant || occupant.color !== color) return total;
    if (occupant.count >= 2) return total + 1;
    return total + (HOME_BOARD[color].includes(index) ? 0.5 : 0.2);
  }, 0);
}

export function getMoveLegalitySummary(state: GameState) {
  const moves = getCandidateMoves(state);
  return {
    legalMoves: moves.length,
    canMove: moves.length > 0,
    mustEnterFromBar: hasCheckersOnBar(state, state.currentPlayer)
  };
}

export function applySequence(state: GameState, moves: CheckerMove[]) {
  return moves.reduce((current, move) => applyMove(current, move), state);
}

export function buildMovesFromDice(state: GameState) {
  return getPlayableMoveSequences(state);
}

export function getPlayableMoveSequences(state: GameState) {
  const results: CheckerMove[][] = [];

  function recurse(current: GameState, sequence: CheckerMove[]) {
    if (current.winner || current.status === "finished") {
      if (sequence.length > 0) {
        results.push(sequence);
      }
      return;
    }

    const moves = getCandidateMoves(current);
    if (moves.length === 0 || current.dice.available.length === 0) {
      if (sequence.length > 0) {
        results.push(sequence);
      }
      return;
    }

    for (const move of moves) {
      const next = applyMove(current, move);
      recurse(next, [...sequence, move]);
    }
  }

  recurse(cloneState(state), []);

  if (results.length === 0) {
    return [];
  }

  const maxLength = Math.max(...results.map((sequence) => sequence.length));
  const longest = results.filter((sequence) => sequence.length === maxLength);

  if (state.dice.available.length === 2) {
    const [firstDie, secondDie] = state.dice.available;
    if (firstDie !== secondDie && maxLength === 1) {
      const highDie = Math.max(firstDie, secondDie);
      const higherDieSequences = longest.filter((sequence) => sequence[0]?.die === highDie);
      if (higherDieSequences.length > 0) {
        return dedupeSequences(higherDieSequences);
      }
    }
  }

  return dedupeSequences(longest);
}

export function getPlayableMoves(state: GameState) {
  return dedupeMoves(
    getPlayableMoveSequences(state)
      .map((sequence) => sequence[0])
      .filter((move): move is CheckerMove => Boolean(move))
  );
}

function dedupeSequences(sequences: CheckerMove[][]) {
  const seen = new Set<string>();
  return sequences.filter((sequence) => {
    const key = sequence.map((move) => serializeMove(move)).join(" | ");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function normalizePipDifference(state: GameState, color: PlayerColor) {
  const own = countPips(state, color);
  const opp = countPips(state, getOpponent(color));
  return opp - own;
}

export function settleTurn(state: GameState) {
  if (state.winner) {
    return { ...state, status: "finished" as const };
  }
  if (state.dice.available.length > 0 && getCandidateMoves(state).length > 0) {
    return state;
  }
  return endTurn(state);
}

export function simulateMove(state: GameState, move: CheckerMove) {
  return applyMove(state, move);
}

export function canCurrentPlayerMove(state: GameState) {
  return getCandidateMoves(state).length > 0;
}

export function isPlayableMove(state: GameState, move: CheckerMove) {
  return getLegalMovesForSource(state, move.from).some((candidate) => candidate.to === move.to && candidate.die === move.die);
}

export function countOpponentAttackers(state: GameState, pointIndex: number, opponent: PlayerColor) {
  const direction = getPlayerDirection(opponent);
  let attackers = 0;
  for (let from = 0; from < POINT_COUNT; from += 1) {
    const occupant = state.points[from];
    if (!occupant || occupant.color !== opponent) continue;
    for (const die of [1, 2, 3, 4, 5, 6]) {
      const destination = from + direction * die;
      if (destination === pointIndex) {
        attackers += occupant.count;
      }
    }
  }
  return attackers;
}
