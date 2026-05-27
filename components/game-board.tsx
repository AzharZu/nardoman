"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import { dedupeMoves, getLegalMovesForSource, getPlayableMoveSequences } from "@/lib/backgammon/engine";
import type { CheckerMove, GameState, MoveQualityLabel } from "@/lib/types";
import { chooseCoachMove } from "@/lib/backgammon/analysis";
import { useActiveAnalysis, useGameStore } from "@/store/game-store";
import { getVibeRoomConfig } from "@/lib/vibe-rooms";
import { cn } from "@/lib/utils";
import { buildEndgameAnalysis } from "@/lib/backgammon/analysis";

const MODE_LABELS = {
  quick: "Quick Match",
  bot: "vs Bot",
  ranked: "Ranked",
  friend: "Friend Room",
  tournament: "Tournament"
} as const;

const TOP_POINTS = Array.from({ length: 12 }, (_, index) => index + 12);
const BOTTOM_POINTS = Array.from({ length: 12 }, (_, index) => 11 - index);

type MoveAnchor = {
  x: number;
  y: number;
};

type BotMoveFlash = {
  id: string;
  move: CheckerMove;
  from: MoveAnchor;
  to: MoveAnchor;
  distance: number;
  angle: number;
};

export function GameBoard({ boardOnly = false, vibeRoom }: { boardOnly?: boolean; vibeRoom?: string }) {
  const reduceMotion = useReducedMotion();
  const game = useGameStore((state) => state.game);
  const matchMode = useGameStore((state) => state.matchMode);
  const roll = useGameStore((state) => state.roll);
  const endCurrentTurn = useGameStore((state) => state.endCurrentTurn);
  const activeAnalysis = useActiveAnalysis();
  const clearSelection = useGameStore((state) => state.clearSelection);
  const selectSource = useGameStore((state) => state.selectSource);
  const executeMove = useGameStore((state) => state.executeMove);
  const botThinking = useGameStore((state) => state.botThinking);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const setActiveAnalysisById = useGameStore((state) => state.setActiveAnalysisById);
  const forfeitMatch = useGameStore((state) => state.forfeitMatch);
  const vibeConfig = getVibeRoomConfig(vibeRoom);
  const lastMoveEntry = moveHistory[0];
  const [liveHint, setLiveHint] = useState<{ id: string; text: string; tone: MoveQualityLabel } | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const selectedMoves = useMemo(
    () => (game.selectedPoint === null ? [] : getLegalMovesForSource(game, game.selectedPoint)),
    [game]
  );
  const playableSequences = useMemo(() => getPlayableMoveSequences(game), [game]);
  const playableEntryMoves = useMemo(
    () => dedupeMoves(playableSequences.map((sequence) => sequence[0]).filter((move): move is CheckerMove => Boolean(move))),
    [playableSequences]
  );
  const suggestedMove = useMemo(() => chooseCoachMove(game, playableEntryMoves), [game, playableEntryMoves]);
  const canBearOff = selectedMoves.some((move) => move.to === "off");
  const localTurnActive = matchMode !== "friend" || game.currentPlayer === game.playerColor;
  const canAct = (matchMode === "bot" ? game.currentPlayer === "white" : localTurnActive) && game.status !== "rolling";
  const lastMove = lastMoveEntry?.move;
  const lastMovePlayer = lastMoveEntry?.player;
  const lastMoveIsOpponent = Boolean(lastMoveEntry && lastMovePlayer !== game.playerColor);
  const boardShellRef = useRef<HTMLDivElement | null>(null);
  const pointRefs = useRef(new Map<number, HTMLButtonElement>());
  const barRefs = useRef<Record<"white" | "black", HTMLButtonElement | null>>({
    white: null,
    black: null
  });
  const offRef = useRef<HTMLDivElement | null>(null);
  const [botMoveFlash, setBotMoveFlash] = useState<BotMoveFlash | null>(null);
  const actionHint =
    game.status === "finished"
      ? "Match over"
      : game.status === "rolling"
        ? "Rolling dice..."
        : game.status === "bot-thinking"
          ? "Bot thinking..."
          : matchMode === "friend" && !localTurnActive
            ? "Waiting for opponent"
            : game.dice.available.length === 0
              ? "Roll the dice"
              : game.selectedPoint
                ? "Select highlighted move"
                : "Choose a checker";
  const helperSubtitle =
    game.status === "finished"
      ? game.winner === game.playerColor
        ? "You closed out the match. Review the analysis below."
        : "The match is finished. Review the analysis below."
      : game.status === "rolling"
        ? "The dice are spinning."
        : botThinking || game.status === "bot-thinking"
          ? "The bot is thinking."
          : game.dice.available.length === 0
            ? "Roll the dice to open your turn."
            : game.selectedPoint
              ? "Choose a highlighted destination."
              : "Select a checker to see legal moves.";
  const turnLabel =
    game.status === "rolling"
      ? "ROLLING..."
      : botThinking || game.status === "bot-thinking"
        ? "THINKING..."
        : matchMode === "friend"
          ? localTurnActive
            ? "YOUR TURN"
            : "OPPONENT TURN"
          : matchMode === "bot" && game.currentPlayer === "black"
            ? "BOT TURN"
            : "YOUR TURN";
  const diceLabel = game.dice.lastRoll ? `${game.dice.lastRoll[0]} + ${game.dice.lastRoll[1]}` : "No dice yet";
  const legalMoveCount = game.selectedPoint === null ? playableEntryMoves.length : selectedMoves.length;
  const hasPlayableMoves = playableSequences.length > 0;
  const canForfeit = game.status !== "finished" && game.status !== "rolling" && game.status !== "bot-thinking" && !botThinking;
  const endgameAnalysis = useMemo(
    () =>
      buildEndgameAnalysis(
        [...moveHistory].reverse().map((historyItem) => ({
          move: historyItem.move,
          player: historyItem.player,
          analysis: historyItem.analysis
        })),
        game,
        game.playerColor,
        matchMode
      ),
    [game, matchMode, moveHistory]
  );
  const forfeitCopy =
    matchMode === "bot"
      ? "End early. No rating penalty versus bot."
      : "End early. Human matches deduct rating.";
  const handleForfeit = () => {
    if (!canForfeit) return;
    const confirmed = window.confirm(
      matchMode === "bot"
        ? "End this match early against the bot? No rating penalty will be applied."
        : "End this match early? This will cost rating."
    );
    if (!confirmed) return;
    forfeitMatch();
  };
  const handlePointClick = (index: number) => {
    const point = game.points[index];
    const selected = game.selectedPoint;
    const destinationMove = selectedMoves.find((move) => move.to === index);

    if (destinationMove) {
      executeMove(destinationMove);
      return;
    }

    if (point && point.color === game.currentPlayer) {
      if (selected === index) {
        clearSelection();
      } else {
        selectSource(index);
      }
      return;
    }

    if (selected !== null && game.selectedPoint === "bar") {
      const fromBarMove = selectedMoves.find((move) => move.to === index);
      if (fromBarMove) {
        executeMove(fromBarMove);
      }
    }
  };

  const handleBarClick = () => {
    if (game.players[game.currentPlayer].bar > 0) {
      selectSource("bar");
    }
  };

  const registerPointRef = (index: number, element: HTMLButtonElement | null) => {
    if (element) {
      pointRefs.current.set(index, element);
      return;
    }
    pointRefs.current.delete(index);
  };

  const registerBarRef = (color: "white" | "black", element: HTMLButtonElement | null) => {
    barRefs.current[color] = element;
  };

  useEffect(() => {
    const move = lastMoveEntry?.move;
    if (!lastMoveEntry || !move) {
      setBotMoveFlash(null);
      return;
    }

    let timeoutId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      const boardElement = boardShellRef.current;
      if (!boardElement || !move) {
        setBotMoveFlash(null);
        return;
      }

      const sourceElement = move.from === "bar" ? barRefs.current[lastMoveEntry.player] : pointRefs.current.get(move.from);
      const destinationElement = move.to === "off" ? offRef.current : pointRefs.current.get(move.to);
      if (!sourceElement || !destinationElement) {
        setBotMoveFlash(null);
        return;
      }

      const boardRect = boardElement.getBoundingClientRect();
      const sourceRect = sourceElement.getBoundingClientRect();
      const destinationRect = destinationElement.getBoundingClientRect();
      const from = {
        x: sourceRect.left + sourceRect.width / 2 - boardRect.left,
        y: sourceRect.top + sourceRect.height / 2 - boardRect.top
      };
      const to = {
        x: destinationRect.left + destinationRect.width / 2 - boardRect.left,
        y: destinationRect.top + destinationRect.height / 2 - boardRect.top
      };
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

      setBotMoveFlash({
        id: lastMoveEntry.id,
        move,
        from,
        to,
        distance,
        angle
      });

      timeoutId = window.setTimeout(() => {
        setBotMoveFlash((current) => (current?.id === lastMoveEntry.id ? null : current));
      }, 920);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lastMoveEntry]);

  useEffect(() => {
    if (!lastMoveEntry) {
      setLiveHint(null);
      return;
    }

    const nextHint = {
      id: lastMoveEntry.id,
      text: lastMoveEntry.analysis.hint,
      tone: lastMoveEntry.analysis.qualityLabel
    };
    setLiveHint(nextHint);

    const lifetime = 3200 + Math.floor(Math.random() * 1800);
    const timeoutId = window.setTimeout(() => {
      setLiveHint((current) => (current?.id === nextHint.id ? null : current));
    }, lifetime);

    return () => window.clearTimeout(timeoutId);
  }, [lastMoveEntry]);

  useEffect(() => {
    setAnalysisOpen(game.status === "finished");
  }, [game.status]);

  if (boardOnly) {
    return (
      <div className="relative flex w-full flex-col gap-2 sm:gap-3">
        <div className="pointer-events-none sticky top-2 z-40 flex justify-center">
          <div className="pointer-events-auto flex w-full max-w-[1160px] items-center gap-2 rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(255,250,243,0.64),rgba(243,236,220,0.4))] px-2.5 py-1.5 shadow-[0_16px_55px_rgba(28,33,18,0.14)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <span className="rounded-full border border-white/20 bg-white/30 px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-[#1f2639]">
                {turnLabel}
              </span>
              <span className="hidden rounded-full border border-white/16 bg-white/18 px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-[#5f665b] md:inline-flex">
                {vibeConfig.label}
              </span>
              {game.status === "rolling" || botThinking || game.status === "bot-thinking" ? (
                <span className="rounded-full border border-[#e2d0a5]/60 bg-[#fbf0d8]/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-[#9b7b3b]">
                  BOT THINKING
                </span>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1">
                <DiceFace value={game.dice.lastRoll?.[0]} rolling={game.status === "rolling"} compact />
                <DiceFace value={game.dice.lastRoll?.[1]} rolling={game.status === "rolling"} compact />
              </div>
              <Button
                variant="secondary"
                onClick={endCurrentTurn}
                disabled={game.status === "finished" || game.status === "rolling" || botThinking || !canAct || hasPlayableMoves}
                className="rounded-full px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
              >
                END TURN
              </Button>
              <Button
                onClick={roll}
                disabled={game.dice.available.length > 0 || game.status === "finished" || game.status === "rolling" || botThinking || !canAct}
                className="rounded-full px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
              >
                ROLL
              </Button>
            </div>
          </div>
        </div>

        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-0 rounded-[2.8rem] bg-[radial-gradient(circle_at_50%_10%,rgba(255,242,214,0.24),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(43,61,31,0.24),transparent_34%),linear-gradient(180deg,rgba(255,250,243,0.2),rgba(18,25,14,0.05))] blur-[2px]" />
          <div
            ref={boardShellRef}
            className={cn(
              "relative mx-auto overflow-hidden rounded-[2.5rem] border border-white/18 p-2 shadow-[0_30px_110px_rgba(23,30,16,0.18)] sm:p-3",
              "bg-[linear-gradient(180deg,rgba(255,250,243,0.58),rgba(243,236,220,0.34))] backdrop-blur-xl"
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,248,232,0.42),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(116,150,70,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.16),rgba(25,30,18,0.04))]" />
            <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />

            <AnimatePresence>
              {botMoveFlash ? (
                <motion.div
                  key={botMoveFlash.id}
                  className="pointer-events-none absolute inset-0 z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="absolute h-[3px] rounded-full bg-gradient-to-r from-[#fff8e2]/10 via-[#fff1c8]/80 to-[#fff8e2]/10 blur-[1px]"
                    style={{
                      left: botMoveFlash.from.x,
                      top: botMoveFlash.from.y,
                      width: botMoveFlash.distance,
                      rotate: botMoveFlash.angle,
                      transformOrigin: "0% 50%"
                    }}
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: [0, 0.95, 0.2], scaleX: [0.4, 1, 1] }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f8efcf]/75 bg-[radial-gradient(circle_at_35%_30%,rgba(255,247,224,0.98),rgba(243,219,180,0.75)_45%,rgba(144,111,58,0.18)_100%)] shadow-[0_0_0_10px_rgba(255,240,194,0.12),0_0_40px_rgba(255,217,136,0.38)]"
                    style={{
                      left: botMoveFlash.from.x,
                      top: botMoveFlash.from.y
                    }}
                    initial={{ x: 0, y: 0, scale: 0.95, opacity: 0 }}
                    animate={{
                      x: botMoveFlash.to.x - botMoveFlash.from.x,
                      y: botMoveFlash.to.y - botMoveFlash.from.y,
                      scale: [0.95, 1.08, 0.98],
                      opacity: [0, 1, 1, 0]
                    }}
                    transition={{ duration: 0.92, ease: "easeInOut" }}
                  >
                    <div className="absolute inset-[4px] rounded-full border border-white/45" />
                    <div className="absolute inset-[8px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.34),transparent)] opacity-75" />
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {liveHint ? (
                <motion.div
                  key={liveHint.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={cn(
                    "absolute right-4 top-4 z-40 max-w-[220px] rounded-full border px-4 py-2 text-sm font-medium shadow-[0_18px_40px_rgba(24,28,18,0.18)] backdrop-blur-xl",
                    liveHint.tone === "strong"
                      ? "border-[#8bbd5f]/35 bg-[#eef7e4]/94 text-[#355b2e]"
                      : liveHint.tone === "safe"
                        ? "border-[#91a9ef]/35 bg-[#eef2ff]/94 text-[#334d8f]"
                        : liveHint.tone === "risky"
                          ? "border-[#e0ab57]/40 bg-[#fff1dd]/94 text-[#8a5c11]"
                          : liveHint.tone === "blunder"
                            ? "border-[#df8d84]/40 bg-[#ffe5e0]/94 text-[#8b3a34]"
                            : "border-white/18 bg-[#f8f3e7]/94 text-[#1f2639]"
                  )}
                >
                  {liveHint.text}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div
              className="relative z-10"
              animate={reduceMotion ? undefined : { y: [0, -2, 0], scale: [1, 1.0025, 1] }}
              transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <div className={cn("grid gap-2 sm:gap-3 md:grid-cols-[1fr_0.22fr_1fr]")}>
                <BoardHalf
                  label="Black home"
                  indices={TOP_POINTS}
                  game={game}
                  onPointClick={handlePointClick}
                  selectedMoves={selectedMoves}
                  suggestedMove={suggestedMove}
                  lastMove={lastMove}
                  lastMoveIsOpponent={lastMoveIsOpponent}
                  orientation="down"
                  reduceMotion={reduceMotion}
                  boardOnly={boardOnly}
                  registerPointRef={registerPointRef}
                  activeBotMove={botMoveFlash?.move ?? null}
                />

                <div className="flex flex-col justify-between gap-2 sm:gap-3">
                  <BarArea
                    color="black"
                    count={game.players.black.bar}
                    onClick={handleBarClick}
                    active={game.selectedPoint === "bar" || botMoveFlash?.move.from === "bar"}
                    registerRef={(el) => registerBarRef("black", el)}
                    boardOnly={boardOnly}
                  />
                  <div
                    ref={offRef}
                    className="pointer-events-none flex min-h-14 items-center justify-center rounded-[1.35rem] border border-white/12 bg-white/10 text-[0.62rem] uppercase tracking-[0.34em] text-[#6e6a5d]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                  >
                    Off
                  </div>
                  <BarArea
                    color="white"
                    count={game.players.white.bar}
                    onClick={handleBarClick}
                    active={game.selectedPoint === "bar" && game.currentPlayer === "white"}
                    registerRef={(el) => registerBarRef("white", el)}
                    boardOnly={boardOnly}
                  />
                </div>

                <BoardHalf
                  label="White home"
                  indices={BOTTOM_POINTS}
                  game={game}
                  onPointClick={handlePointClick}
                  selectedMoves={selectedMoves}
                  suggestedMove={suggestedMove}
                  lastMove={lastMove}
                  lastMoveIsOpponent={lastMoveIsOpponent}
                  orientation="up"
                  reduceMotion={reduceMotion}
                  boardOnly={boardOnly}
                  registerPointRef={registerPointRef}
                  activeBotMove={botMoveFlash?.move ?? null}
                />
              </div>
            </motion.div>

            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.26em] text-[#5f665b] backdrop-blur-md">
                {actionHint}
              </span>
              <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.26em] text-[#5f665b] backdrop-blur-md">
                {legalMoveCount} legal moves
              </span>
              <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.26em] text-[#5f665b] backdrop-blur-md">
                {vibeConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none flex justify-center px-2">
          <div className="rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[0.62rem] uppercase tracking-[0.28em] text-[#5f665b] shadow-[0_14px_40px_rgba(23,30,16,0.08)] backdrop-blur-md">
            {game.status === "rolling"
              ? "Dice in motion"
              : game.status === "bot-thinking"
                ? "Bot is thinking..."
                : "Board first"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", boardOnly && "space-y-3")}>
      <Panel
        className={cn(
          "space-y-5 border-[#d9ccb8] bg-[#fbf7ef]/95 p-4 shadow-[0_18px_55px_rgba(92,84,60,0.08)] sm:p-5",
          boardOnly && "border-white/18 bg-white/14 shadow-[0_18px_55px_rgba(21,28,16,0.14)] backdrop-blur-xl"
        )}
      >
        <div className={cn("grid gap-4", boardOnly ? "lg:grid-cols-[1fr_0.92fr]" : "lg:grid-cols-[1.12fr_0.88fr]")}>
          <motion.div
            key={game.currentPlayer}
            initial={reduceMotion ? undefined : { opacity: 0.9, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            className={cn(
              "rounded-[1.9rem] border p-5 sm:p-6",
              boardOnly
                ? "border-white/16 bg-[linear-gradient(135deg,rgba(255,249,240,0.62),rgba(240,236,224,0.42))] shadow-[0_14px_45px_rgba(28,33,18,0.14)] backdrop-blur-xl"
                : "border-[#d8cfbb] bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(240,236,224,0.95))] shadow-[0_14px_45px_rgba(80,67,35,0.08)]",
              game.status === "bot-thinking" && "animate-pulse"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#6e6a5d]">Current turn</p>
                <div className="flex flex-wrap items-end gap-3">
                  <h2
                    className={cn(
                      "font-semibold tracking-[-0.06em] text-[#1f2639]",
                      boardOnly ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
                    )}
                  >
                    {turnLabel}
                  </h2>
                  {!boardOnly ? (
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.24em]",
                        game.currentPlayer === "white"
                          ? "border-[#cfe0ba] bg-[#eef6df] text-[#5d8f49]"
                          : "border-[#e1cfb1] bg-[#f5ead5] text-[#9b7b3b]"
                      )}
                    >
                      {game.currentPlayer === "white" ? "White to move" : "Black to move"}
                    </span>
                  ) : null}
                </div>
                <p className={cn("text-sm leading-6 text-[#5f665b]", boardOnly && "max-w-2xl")}>{helperSubtitle}</p>
              </div>
              {!boardOnly ? (
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-[1.5rem] border text-xl font-semibold shadow-lg",
                    game.currentPlayer === "white"
                      ? "border-[#d2dfbf] bg-[#eef6df] text-[#5d8f49]"
                      : "border-[#d8ccb6] bg-[#f5ead5] text-[#9b7b3b]"
                  )}
                >
                  {game.turnCount}
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#39404f]">
                {actionHint}
              </Badge>
              <Badge className="border-[#d8ccb8] bg-[#fff7e8] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#8d6a2b]">
                Dice: {diceLabel}
              </Badge>
              <Badge className="border-[#d8ccb8] bg-[#edf5e1] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#5d8f49]">
                {legalMoveCount} legal moves
              </Badge>
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#39404f]">
                {vibeConfig.badge}
              </Badge>
              {!boardOnly ? (
                <>
                  <Badge className="border-[#d8ccb8] bg-[#faf7ef] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#5f665b]">
                    {game.status === "finished" ? "Match complete" : game.selectedPoint ? "Checker selected" : "Board ready"}
                  </Badge>
                  <Badge className="border-[#d8ccb8] bg-[#f4efe3] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#6e6a5d]">
                    {MODE_LABELS[matchMode]}
                  </Badge>
                  <Badge className="border-[#d8ccb8] bg-[#f0f6e6] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#5d8f49]">
                    Your side: {game.playerColor.toUpperCase()}
                  </Badge>
                  {lastMoveIsOpponent && lastMove ? (
                    <Badge className="border-[#e2d0a5] bg-[#fbf0d8] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#9b7b3b]">
                      Opponent moved {formatMove(lastMove)}
                    </Badge>
                  ) : null}
                </>
              ) : (
                <Badge className="border-[#d8ccb8] bg-[#f4efe3] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#6e6a5d]">
                  {game.status === "finished" ? "Match complete" : game.selectedPoint ? "Selecting" : "Board ready"}
                </Badge>
              )}
            </div>
          </motion.div>

          <div
            className={cn(
              "rounded-[1.9rem] border p-5 shadow-[0_14px_45px_rgba(80,67,35,0.08)] sm:p-6",
              boardOnly
                ? "border-white/16 bg-[linear-gradient(180deg,rgba(255,249,240,0.56),rgba(243,237,223,0.34))] backdrop-blur-xl"
                : "border-[#d8ccb8] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(243,237,223,0.96))]"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#6e6a5d]">Dice</p>
                {!boardOnly ? (
                  <p className="mt-1 text-lg font-medium text-[#1f2639]">
                    {game.dice.available.length > 0 ? "Select a checker and play the dice you have." : "Roll the dice to begin your turn."}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#5f665b]">
                    {game.status === "rolling"
                      ? "Rolling..."
                      : game.status === "bot-thinking"
                        ? "Watching the bot..."
                        : "Tap roll when it is your turn."}
                  </p>
                )}
              </div>
              {!boardOnly ? (
              <Button
                variant="secondary"
                onClick={endCurrentTurn}
                disabled={game.status === "finished" || game.status === "rolling" || botThinking || !canAct || hasPlayableMoves}
                className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em]"
              >
                  {hasPlayableMoves ? "Moves available" : "End turn"}
              </Button>
            ) : null}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <DiceFace value={game.dice.lastRoll?.[0]} rolling={game.status === "rolling"} />
                <DiceFace value={game.dice.lastRoll?.[1]} rolling={game.status === "rolling"} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    onClick={handleForfeit}
                    disabled={!canForfeit}
                    variant="secondary"
                    className="rounded-full border-[#d8ccb8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    End early
                  </Button>
                  <Button
                    onClick={roll}
                    disabled={game.dice.available.length > 0 || game.status === "finished" || game.status === "rolling" || botThinking || !canAct}
                    className="min-w-24 rounded-full px-5 py-3 text-sm font-semibold tracking-[0.18em]"
                  >
                    {game.status === "rolling" ? "ROLLING" : "ROLL"}
                  </Button>
                </div>
                <p className="max-w-[16rem] text-right text-[0.7rem] leading-5 text-[#6e6a5d]">{forfeitCopy}</p>
              </div>
            </div>
            {!boardOnly ? (
              <p className="mt-4 text-sm leading-6 text-[#5f665b]">
                {game.status === "rolling"
                  ? "Dice are in motion."
                  : game.dice.lastRoll
                    ? "Choose a checker, then a softly glowing destination point."
                    : "Press ROLL to start your turn."}
              </p>
            ) : null}
          </div>
        </div>
      </Panel>

      <div
        ref={boardShellRef}
        className={cn(
          "relative overflow-hidden rounded-[1.9rem] border p-3 shadow-[0_18px_55px_rgba(80,67,35,0.08)] sm:p-4",
          boardOnly
            ? "border-white/18 bg-[linear-gradient(180deg,rgba(255,250,243,0.58),rgba(243,236,220,0.34))] backdrop-blur-xl shadow-[0_26px_85px_rgba(32,42,18,0.16)]"
            : "border-[#d9ccb8] bg-[linear-gradient(180deg,rgba(251,247,238,0.98),rgba(243,236,220,0.98))]"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,248,232,0.42),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(116,150,70,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.16),rgba(25,30,18,0.04))]" />
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />

        <AnimatePresence>
          {botMoveFlash ? (
            <motion.div
              key={botMoveFlash.id}
              className="pointer-events-none absolute inset-0 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute h-[3px] rounded-full bg-gradient-to-r from-[#fff8e2]/10 via-[#fff1c8]/80 to-[#fff8e2]/10 blur-[1px]"
                style={{
                  left: botMoveFlash.from.x,
                  top: botMoveFlash.from.y,
                  width: botMoveFlash.distance,
                  rotate: botMoveFlash.angle,
                  transformOrigin: "0% 50%"
                }}
                initial={{ opacity: 0, scaleX: 0.4 }}
                animate={{ opacity: [0, 0.95, 0.2], scaleX: [0.4, 1, 1] }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
              <motion.div
                className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f8efcf]/75 bg-[radial-gradient(circle_at_35%_30%,rgba(255,247,224,0.98),rgba(243,219,180,0.75)_45%,rgba(144,111,58,0.18)_100%)] shadow-[0_0_0_10px_rgba(255,240,194,0.12),0_0_40px_rgba(255,217,136,0.38)]"
                style={{
                  left: botMoveFlash.from.x,
                  top: botMoveFlash.from.y
                }}
                initial={{ x: 0, y: 0, scale: 0.95, opacity: 0 }}
                animate={{
                  x: botMoveFlash.to.x - botMoveFlash.from.x,
                  y: botMoveFlash.to.y - botMoveFlash.from.y,
                  scale: [0.95, 1.08, 0.98],
                  opacity: [0, 1, 1, 0]
                }}
                transition={{ duration: 0.92, ease: "easeInOut" }}
              >
                <div className="absolute inset-[4px] rounded-full border border-white/45" />
                <div className="absolute inset-[8px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.34),transparent)] opacity-75" />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          className="relative z-10"
          animate={reduceMotion ? undefined : { y: [0, -2, 0], scale: [1, 1.0025, 1] }}
          transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <div className={cn("grid gap-3", boardOnly ? "md:grid-cols-[1fr_0.22fr_1fr]" : "md:grid-cols-[1fr_0.3fr_1fr]")}>
            <BoardHalf
              label="Black home"
              indices={TOP_POINTS}
              game={game}
              onPointClick={handlePointClick}
              selectedMoves={selectedMoves}
              suggestedMove={suggestedMove}
              lastMove={lastMove}
              lastMoveIsOpponent={lastMoveIsOpponent}
              orientation="down"
              reduceMotion={reduceMotion}
              boardOnly={boardOnly}
              registerPointRef={registerPointRef}
              activeBotMove={botMoveFlash?.move ?? null}
            />

            <div className={cn("flex flex-col justify-between gap-3", boardOnly && "gap-2")}>
              <BarArea
                color="black"
                count={game.players.black.bar}
                onClick={handleBarClick}
                active={game.selectedPoint === "bar" || botMoveFlash?.move.from === "bar"}
                registerRef={(el) => registerBarRef("black", el)}
                boardOnly={boardOnly}
              />
              {boardOnly ? (
                <div
                  ref={offRef}
                  className="pointer-events-none flex min-h-14 items-center justify-center rounded-[1.35rem] border border-white/12 bg-white/10 text-[0.62rem] uppercase tracking-[0.34em] text-[#6e6a5d]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                >
                  Off
                </div>
              ) : (
                <div
                  ref={offRef}
                  className={cn("relative rounded-[1.4rem] border border-[#d8ccb8] bg-[#fffaf0] p-3 text-center", boardOnly && "p-2")}
                >
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[#6e6a5d]">Bear off</p>
                  <p className="mt-2 text-sm leading-6 text-[#4c5444]">
                    {canBearOff ? "You can bear off now." : "Bring every checker home first."}
                  </p>
                  <div className="mt-3 rounded-full border border-[#d8ccb8] bg-[#f6f1e5] px-3 py-2 text-xs text-[#6e6a5d]">
                    Legal points glow softly
                  </div>
                </div>
              )}
              <BarArea
                color="white"
                count={game.players.white.bar}
                onClick={handleBarClick}
                active={game.selectedPoint === "bar" && game.currentPlayer === "white"}
                registerRef={(el) => registerBarRef("white", el)}
                boardOnly={boardOnly}
              />
            </div>

            <BoardHalf
              label="White home"
              indices={BOTTOM_POINTS}
              game={game}
              onPointClick={handlePointClick}
              selectedMoves={selectedMoves}
              suggestedMove={suggestedMove}
              lastMove={lastMove}
              lastMoveIsOpponent={lastMoveIsOpponent}
              orientation="up"
              reduceMotion={reduceMotion}
              boardOnly={boardOnly}
              registerPointRef={registerPointRef}
              activeBotMove={botMoveFlash?.move ?? null}
            />
          </div>
        </motion.div>
      </div>

      {!boardOnly ? (
        <Panel className="space-y-4 border-[#d9ccb8] bg-[#fffaf3] p-4 shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Move history</p>
              <h3 className="text-base font-semibold tracking-tight text-[#1f2639]">Tap a move to inspect it</h3>
            </div>
            <div className="text-sm text-[#6e6a5d]">
              {activeAnalysis ? activeAnalysis.qualityLabel.toUpperCase() : "Recent moves"}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 premium-scrollbar">
            {moveHistory.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-[#d8ccb8] bg-[#fffaf3] px-3 py-2 text-xs text-[#6e6a5d]">
                Moves you make will appear here.
              </div>
            ) : (
              moveHistory.map((entry, index) => {
                const qualityTone = getQualityTone(entry.analysis.qualityLabel);
                const selected = entry.analysis === activeAnalysis;
                const actorLabel =
                  entry.player === game.playerColor ? "You" : matchMode === "bot" && entry.player === "black" ? "Bot" : "Opponent";
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setActiveAnalysisById(entry.id)}
                    className={cn(
                      "min-w-[190px] rounded-[1rem] border px-3 py-2 text-left transition",
                      selected ? "border-[#8bbd5f]/60 bg-[#edf7e2]" : "border-[#d8ccb8] bg-[#fffaf3] hover:border-[#8bbd5f]/40 hover:bg-[#f4f9ea]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#f0f4e5] px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-[#6e6a5d]">
                        {actorLabel}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.22em]", qualityTone.badge)}>
                        {entry.analysis.qualityLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-[#1f2639]">
                      {formatMove(entry.move)}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[#6e6a5d]">
                      <span>Die {entry.move.die}</span>
                      <span>#{moveHistory.length - index}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-[1.15rem] border border-[#d8ccb8] bg-[#fffaf3] p-3">
            <p className="text-[0.7rem] uppercase tracking-[0.24em] text-[#6e6a5d]">Explanation</p>
            <p className="mt-2 text-sm leading-6 text-[#1f2639]">
              {activeAnalysis
                ? activeAnalysis.explanation
                : "Select a move to see why it was safe, risky, or strong."}
            </p>
            {activeAnalysis?.bestMoveRecommendation ? (
              <div className="mt-3 rounded-[0.9rem] border border-[#d8ccb8] bg-[#fff7e8] px-3 py-2 text-sm text-[#6a5223]">
                <p className="text-[0.65rem] uppercase tracking-[0.24em] text-[#8d6a2b]">Safer alternative</p>
                <p className="mt-1 leading-6">{activeAnalysis.bestMoveRecommendation}</p>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : (
        <div className="rounded-[1.25rem] border border-white/14 bg-white/10 px-4 py-3 text-sm text-[#1f2639] shadow-[0_10px_30px_rgba(21,28,16,0.08)] backdrop-blur-md">
          <span className="text-[0.65rem] uppercase tracking-[0.24em] text-[#6e6a5d]">Board state</span>
          <p className="mt-1">{turnLabel}</p>
        </div>
      )}

      <AnimatePresence>
        {game.status === "finished" && analysisOpen ? (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#10150f]/60 px-4 py-6 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-3xl rounded-[2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,249,238,0.98),rgba(244,236,221,0.96))] p-5 shadow-[0_35px_120px_rgba(16,20,12,0.32)] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[#6e6a5d]">Well played.</p>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#1f2639]">{endgameAnalysis.winnerName}</h2>
                  <p className="text-base text-[#5f665b]">{endgameAnalysis.resultLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalysisOpen(false)}
                  className="rounded-full border border-[#d8ccb8] bg-white/80 px-3 py-2 text-sm font-medium text-[#2a3041] transition hover:bg-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4 rounded-[1.4rem] border border-[#d8ccb8] bg-white/72 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#6e6a5d]">Game score</p>
                      <p className="mt-1 text-4xl font-semibold tracking-tight text-[#1f2639]">{endgameAnalysis.score.toFixed(1)}/10</p>
                    </div>
                    <Badge className="border-[#8bbd5f]/40 bg-[#edf7e2] px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.24em] text-[#5d8f49]">
                      {endgameAnalysis.qualityLabel}
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <MetricTile label="Safe moves" value={endgameAnalysis.stats.safeMoves} />
                    <MetricTile label="Risky moves" value={endgameAnalysis.stats.riskyMoves} />
                    <MetricTile label="Successful hits" value={endgameAnalysis.stats.successfulHits} />
                    <MetricTile label="Blunders" value={endgameAnalysis.stats.blunders} />
                    <MetricTile label="Defense rating" value={`${endgameAnalysis.stats.defenseRating}/10`} />
                    <MetricTile label="Aggression rating" value={`${endgameAnalysis.stats.aggressionRating}/10`} />
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.4rem] border border-[#d8ccb8] bg-white/72 p-4">
                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#6e6a5d]">AI summary</p>
                    <p className="mt-2 text-sm leading-7 text-[#1f2639]">{endgameAnalysis.summary}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[#d8ccb8] bg-[#fff7e8] p-3 text-sm text-[#6a5223]">
                    The board is locked and the result is saved. Review the move trail below whenever you want to replay the match.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BoardHalf({
  label,
  indices,
  game,
  onPointClick,
  selectedMoves,
  suggestedMove,
  lastMove,
  lastMoveIsOpponent,
  orientation,
  reduceMotion,
  boardOnly,
  registerPointRef,
  activeBotMove
}: {
  label: string;
  indices: number[];
  game: GameState;
  onPointClick: (index: number) => void;
  selectedMoves: CheckerMove[];
  suggestedMove: CheckerMove | null;
  lastMove: CheckerMove | null;
  lastMoveIsOpponent: boolean;
  orientation: "up" | "down";
  reduceMotion: boolean | null;
  boardOnly: boolean;
  registerPointRef: (index: number, element: HTMLButtonElement | null) => void;
  activeBotMove: CheckerMove | null;
}) {
  return (
    <div className="space-y-2">
      {!boardOnly ? <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[#6e6a5d]">{label}</p> : null}
      <div className="overflow-x-auto pb-1 premium-scrollbar">
        <div className="grid w-full min-w-0 grid-cols-12 gap-1.5 sm:gap-2">
          {indices.map((index) => {
            const point = game.points[index];
            const legalHere = selectedMoves.some((move) => move.to === index);
            const suggestedHere = suggestedMove?.to === index || suggestedMove?.from === index;
            const lastMoveFromHere = lastMove?.from === index;
            const lastMoveToHere = lastMove?.to === index;
            const isSelected = game.selectedPoint === index;
            const botMoveFromHere = activeBotMove?.from === index;
            const botMoveToHere = activeBotMove?.to === index;
            const totalCheckers = point?.count ?? 0;

            return (
              <motion.button
                key={index}
                ref={(element) => registerPointRef(index, element)}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPointClick(index)}
                aria-label={`Point ${index + 1}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex flex-col justify-between overflow-hidden rounded-[1.2rem] border border-[#d9ccb8] px-1.5 py-1.5 text-left transition",
                  boardOnly ? "min-h-56 sm:min-h-72 lg:min-h-96 sm:px-2 sm:py-2" : "min-h-32 sm:min-h-36 sm:px-2 sm:py-2",
                  index % 2 === 0 ? "bg-[#efe3c8]/90" : "bg-[#d7e0bd]/90",
                  legalHere && "border-[#84b65f] bg-[#edf7e3] ring-2 ring-[#9dc77a]/40",
                  isSelected && "border-[#d2a85a] bg-[#faf0d7]",
                  suggestedHere && "border-[#d2a85a] bg-[#fbf0d8] ring-2 ring-[#e3c27a]/40",
                  lastMoveIsOpponent && (lastMoveFromHere || lastMoveToHere) && "border-[#e1c995] bg-[#f8edcb]",
                  botMoveFromHere && "border-[#d9b65c] bg-[#fbf0d5] shadow-[0_0_0_5px_rgba(216,177,93,0.09)]",
                  botMoveToHere && "border-[#f0cf7d] bg-[#fbf6de] shadow-[0_0_0_7px_rgba(240,207,125,0.11)]"
                )}
              >
                <span className="relative z-10 text-[10px] uppercase tracking-[0.18em] text-[#6e6a5d]">{index + 1}</span>

                <div
                  className={cn(
                    "absolute inset-x-1 bottom-1 top-6 rounded-[1.05rem] opacity-95",
                    index % 2 === 0 ? "bg-[#cfb78f]/35" : "bg-[#a9c98d]/38"
                  )}
                  style={{
                    clipPath:
                      orientation === "down"
                        ? "polygon(50% 5%, 100% 100%, 0% 100%)"
                        : "polygon(50% 95%, 100% 0%, 0% 0%)"
                  }}
                />

                <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-1">
                  {point ? (
                    <div className="flex flex-col items-center gap-1">
                      <AnimatePresence initial={false}>
                        {Array.from({ length: Math.min(totalCheckers, 5) }, (_, checkerIndex) => (
                          <CheckerPiece
                            key={`${index}-${checkerIndex}-${point.color}`}
                            color={point.color}
                            active={isSelected || botMoveToHere}
                            reduceMotion={reduceMotion}
                            boardOnly={boardOnly}
                          />
                        ))}
                      </AnimatePresence>
                      {totalCheckers > 5 ? <Badge className="mt-1">{totalCheckers}</Badge> : null}
                    </div>
                  ) : (
                    <div className={cn("rounded-full border border-[#d8ccb8] bg-[#fffaf0] text-[11px] text-[#6e6a5d]", boardOnly ? "px-1.5 py-0.5" : "px-2 py-1")}>
                      Open
                    </div>
                  )}
                  {legalHere ? (
                    <motion.div
                      animate={reduceMotion ? undefined : { scale: [1, 1.05, 1], opacity: [0.92, 1, 0.92] }}
                      transition={{ duration: 1.3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                      <Badge className="border-[#8bbd5f]/60 bg-[#edf7e2] text-[#5d8f49] shadow-[0_0_0_4px_rgba(141,191,98,0.08),0_0_28px_rgba(141,191,98,0.25)]">
                        Move {orientation === "down" ? <ArrowDown className="ml-1 inline h-3 w-3" /> : <ArrowUp className="ml-1 inline h-3 w-3" />}
                      </Badge>
                    </motion.div>
                  ) : null}
                  {botMoveFromHere ? (
                    <motion.div
                      className="mt-0.5 h-2 w-2 rounded-full bg-[#d8b15d] shadow-[0_0_0_6px_rgba(216,177,93,0.12),0_0_16px_rgba(216,177,93,0.5)]"
                      animate={reduceMotion ? undefined : { scale: [1, 1.3, 1], opacity: [0.65, 1, 0.75] }}
                      transition={{ duration: 0.9, ease: "easeInOut" }}
                    />
                  ) : null}
                  {!boardOnly && suggestedHere ? (
                    <Badge className="border-[#d8b15d]/60 bg-[#fbefcf] text-[#99743a] shadow-[0_0_0_4px_rgba(216,177,93,0.08),0_0_24px_rgba(216,177,93,0.22)]">
                      Hint
                    </Badge>
                  ) : null}
                  {!boardOnly && lastMoveIsOpponent && lastMoveToHere ? (
                    <Badge className="border-[#d8b15d]/60 bg-[#faf1d9] text-[#8f6a2f] shadow-[0_0_0_4px_rgba(216,177,93,0.08)]">
                      Last
                    </Badge>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckerPiece({
  color,
  active,
  reduceMotion,
  boardOnly
}: {
  color: "white" | "black";
  active?: boolean;
  reduceMotion?: boolean | null;
  boardOnly?: boolean;
}) {
  return (
    <motion.div
      layout
      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
      animate={reduceMotion ? undefined : { y: [0, -1, 0] }}
      transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      className={cn(
        "relative rounded-full border shadow-lg",
        boardOnly ? "h-8 w-8 sm:h-10 sm:w-10" : "h-6 w-6 sm:h-7 sm:w-7",
        color === "white"
          ? "border-[#f4f0e4] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.98),rgba(247,244,233,0.88)_40%,rgba(206,199,178,0.8)_100%)]"
          : "border-[#253122]/20 bg-[radial-gradient(circle_at_35%_30%,rgba(96,111,83,0.95),rgba(42,56,34,0.98)_42%,rgba(18,24,16,0.98)_100%)]",
        active && "ring-2 ring-[#8bbd5f]/90 ring-offset-2 ring-offset-transparent shadow-[0_0_0_8px_rgba(141,191,98,0.12),0_0_30px_rgba(141,191,98,0.3)]"
      )}
    >
      <div className="absolute inset-[3px] rounded-full border border-white/35" />
      <div className="absolute inset-[5px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.35),transparent)] opacity-80" />
    </motion.div>
  );
}

function BarArea({
  color,
  count,
  onClick,
  active,
  registerRef,
  boardOnly
}: {
  color: "white" | "black";
  count: number;
  onClick: () => void;
  active?: boolean;
  registerRef: (element: HTMLButtonElement | null) => void;
  boardOnly?: boolean;
}) {
  return (
    <button
      ref={registerRef}
      onClick={onClick}
      aria-label={`${color} bar`}
      className={cn(
        "flex min-h-20 flex-col items-center justify-center rounded-[1.25rem] border px-3 py-3.5 transition duration-300",
        boardOnly && "min-h-16 bg-white/10 backdrop-blur-md",
        count > 0 ? "border-[#d7ccb1] bg-[#fffaf0]" : "border-[#d8ccb8] bg-[#f6f1e5]",
        active && "ring-2 ring-[#8bbd5f]/70 shadow-[0_0_0_6px_rgba(141,191,98,0.08),0_0_24px_rgba(141,191,98,0.18)]"
      )}
    >
      <p className="text-[0.65rem] uppercase tracking-[0.24em] text-[#6e6a5d]">{color} bar</p>
      <div className="mt-2 flex items-center gap-2">
        <CheckerPiece color={color} boardOnly={boardOnly} />
        <span className="text-sm font-semibold text-[#1f2639]">{count}</span>
      </div>
    </button>
  );
}

function getQualityTone(label: MoveQualityLabel) {
  if (label === "strong") {
    return { badge: "bg-[#edf7e2] text-[#5d8f49] border-[#8bbd5f]/40" };
  }
  if (label === "safe") {
    return { badge: "bg-[#eef3ff] text-[#4b67a8] border-[#8aa6ef]/40" };
  }
  if (label === "risky") {
    return { badge: "bg-[#fff0dc] text-[#a56a15] border-[#e0ab57]/40" };
  }
  if (label === "blunder") {
    return { badge: "bg-[#ffe3df] text-[#b1433c] border-[#e08b83]/40" };
  }
  return { badge: "bg-[#f1ece1] text-[#5f665b] border-[#d8ccb8]" };
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] border border-[#d8ccb8] bg-[#fffaf3] px-3 py-2">
      <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#6e6a5d]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1f2639]">{value}</p>
    </div>
  );
}

function formatMove(move: CheckerMove) {
  const from = move.from === "bar" ? "bar" : `p${move.from + 1}`;
  const to = move.to === "off" ? "off" : `p${move.to + 1}`;
  return `${from} → ${to}`;
}

type DiceFaceProps = {
  value?: number;
  rolling?: boolean;
  compact?: boolean;
};

function DiceFace({ value, rolling, compact }: DiceFaceProps) {
  return (
    <motion.div
      style={{ perspective: 1000 }}
      animate={
        rolling
          ? {
              rotateX: [0, 180, 360],
              rotateY: [0, -160, -360],
              y: [0, -4, 0],
              scale: [1, 1.04, 1]
            }
          : undefined
      }
      transition={rolling ? { duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } : undefined}
      className={cn(
        "flex items-center justify-center rounded-[1.25rem] border border-[#d8ccb8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,221,0.96))] font-semibold text-[#1f2639] shadow-[0_16px_40px_rgba(80,67,35,0.12)]",
        compact ? "h-11 w-11 text-lg sm:h-12 sm:w-12 sm:text-xl" : "h-14 w-14 text-xl sm:h-16 sm:w-16 sm:text-2xl"
      )}
    >
      {rolling ? "•" : typeof value === "number" ? value : "–"}
    </motion.div>
  );
}
