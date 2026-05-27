import type { PlayerColor } from "@/lib/types";

export const CHECKERS_PER_PLAYER = 15;
export const POINT_COUNT = 24;
export const HOME_BOARD: Record<PlayerColor, number[]> = {
  white: [0, 1, 2, 3, 4, 5],
  black: [18, 19, 20, 21, 22, 23]
};

export const STARTING_POINTS: Array<{ index: number; color: PlayerColor; count: number }> = [
  { index: 23, color: "white", count: 2 },
  { index: 12, color: "white", count: 5 },
  { index: 7, color: "white", count: 3 },
  { index: 5, color: "white", count: 5 },
  { index: 0, color: "black", count: 2 },
  { index: 11, color: "black", count: 5 },
  { index: 16, color: "black", count: 3 },
  { index: 18, color: "black", count: 5 }
];

export const OPPONENT: Record<PlayerColor, PlayerColor> = {
  white: "black",
  black: "white"
};

export const DIRECTION: Record<PlayerColor, 1 | -1> = {
  white: -1,
  black: 1
};

