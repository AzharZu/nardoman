"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui";
import { GameBoard } from "@/components/game-board";
import { useAuthStore } from "@/store/auth-store";
import { useGameStore } from "@/store/game-store";
import { useProfileStore } from "@/store/profile-store";
import { getStoredVibeRoom } from "@/lib/data/vibe-room-client";
import {
  createLocalRoom,
  getLocalRoom,
  getPlayerColorForRoom,
  joinLocalRoom,
  loadRoomSnapshot,
  saveRoomSnapshot,
  subscribeRoomSnapshot,
  type RoomGamePayload,
  type RoomState
} from "@/lib/data/room-client";
import { hasSupabaseConfig, getSupabaseSetupMessage } from "@/lib/supabase/config";
import { Badge, Button, Panel } from "@/components/ui";
import { formatTrialRemaining, getEffectiveSubscriptionSnapshot } from "@/lib/data/subscription-client";
import { getVibeRoomConfig, isVibeRoomKey, preloadVibeRoomBackgrounds } from "@/lib/vibe-rooms";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = typeof params?.roomId === "string" ? params.roomId : "";
  const requestedSide = searchParams?.get("side");
  const user = useAuthStore((state) => state.user);
  const { profile, loadProfile } = useProfileStore();
  const startNewMatch = useGameStore((state) => state.startNewMatch);
  const applySnapshot = useGameStore((state) => state.applySnapshot);
  const game = useGameStore((state) => state.game);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const applyingRemote = useRef(false);
  const gameStatus = useGameStore((state) => state.game.status);

  useEffect(() => {
    setInviteUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (user) {
      void loadProfile(user.id, user.email, true);
    }
  }, [loadProfile, user]);

  useEffect(() => {
    preloadVibeRoomBackgrounds(["grass-picnic", "zen-garden", "neon-city"]);
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileKey = `backgammon-rush-profile-${user.id}`;
    const subscriptionKey = `backgammon-rush-subscription-${user.id}`;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === profileKey || event.key === subscriptionKey) {
        void loadProfile(user.id, user.email, true);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadProfile, user]);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const normalizedSide = requestedSide === "black" || requestedSide === "random" || requestedSide === "white" ? requestedSide : "white";
    const existing = getLocalRoom(roomId);

    if (!existing) {
      const created = createLocalRoom(roomId, user.id, normalizedSide);
      setRoom(created);
      router.replace(`/room/${roomId}`);
      return;
    }

    if (existing.playerWhite !== user.id && existing.playerBlack !== user.id) {
      const joined = joinLocalRoom(roomId, user.id);
      if (joined) {
        setRoom(joined);
        return;
      }
    }

    setRoom(existing);
  }, [requestedSide, roomId, router, user]);

  const playerColor = useMemo(() => {
    if (!room || !user) return "white";
    return getPlayerColorForRoom(room, user.id);
  }, [room, user]);

  const subscription = useMemo(() => getEffectiveSubscriptionSnapshot(profile, user), [profile, user]);
  const [activeRoomKey, setActiveRoomKey] = useState("grass-picnic");

  useEffect(() => {
    const storedRoom = getStoredVibeRoom();
    if (storedRoom && isVibeRoomKey(storedRoom)) {
      setActiveRoomKey(storedRoom);
      return;
    }

    if (subscription.isActive && profile?.favorite_vibe_room && isVibeRoomKey(profile.favorite_vibe_room)) {
      setActiveRoomKey(profile.favorite_vibe_room);
      return;
    }

    setActiveRoomKey("grass-picnic");
  }, [profile, subscription.isActive]);

  const vibeRoom = getVibeRoomConfig(activeRoomKey);

  useEffect(() => {
    if (!user || !room) return;

    if (room.status === "active") {
      const snapshot = loadRoomSnapshot(roomId);
      if (snapshot) {
        applyingRemote.current = true;
        applySnapshot(snapshot);
        window.requestAnimationFrame(() => {
          applyingRemote.current = false;
        });
      } else {
        startNewMatch("friend", "Tactical", roomId, playerColor);
      }
    } else {
      startNewMatch("friend", "Tactical", roomId, playerColor);
    }
    setSyncReady(true);
  }, [applySnapshot, playerColor, room, roomId, startNewMatch, user]);

  useEffect(() => {
    if (!room || room.status !== "active") return;

    const unsubscribeGame = useGameStore.subscribe((state) => {
      if (applyingRemote.current) return;
      if (state.matchMode !== "friend" || state.roomId !== roomId) return;

      const snapshot: RoomGamePayload = {
        roomId,
        updatedAt: new Date().toISOString(),
        game: state.game,
        matchMode: state.matchMode,
        matchId: state.matchId,
        botThinking: state.botThinking,
        moveHistory: state.moveHistory,
        activeAnalysis: state.activeAnalysis,
        matchSaved: state.matchSaved,
        endedEarly: state.endedEarly,
        forfeitBy: state.forfeitBy,
        ratingDelta: state.ratingDelta
      };
      saveRoomSnapshot(snapshot);
    });

    const unsubscribeRoom = subscribeRoomSnapshot(roomId, (snapshot) => {
      if (!snapshot) return;
      applyingRemote.current = true;
      applySnapshot(snapshot);
      window.requestAnimationFrame(() => {
        applyingRemote.current = false;
      });
    });

    return () => {
      unsubscribeGame();
      unsubscribeRoom();
    };
  }, [applySnapshot, room, roomId]);

  useEffect(() => {
    const onStorage = () => {
      const updated = getLocalRoom(roomId);
      if (updated) {
        setRoom(updated);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [roomId]);

  useEffect(() => {
    if (gameStatus !== "finished") return;

    const redirectTimer = window.setTimeout(() => {
      window.location.replace("/");
    }, 2000);

    return () => window.clearTimeout(redirectTimer);
  }, [gameStatus]);

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="page-shell">
        <Container className="flex min-h-[60vh] items-center justify-center">
          <Panel className="max-w-md space-y-4 text-center">
            <p className="text-2xl text-[#2a3041]">Please sign in to join a friend room.</p>
            <Link href="/auth/login" className="inline-flex rounded-2xl bg-[#6dae58] px-6 py-3 text-lg font-semibold text-white">
              Sign In
            </Link>
          </Panel>
        </Container>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page-shell">
        <Container className="flex min-h-[60vh] items-center justify-center">
          <p className="text-2xl text-[#6f7480]">Loading room...</p>
        </Container>
      </div>
    );
  }

  const active = room.status === "active" && syncReady;
  const waitingForOpponent = room.status === "waiting" || !room.playerBlack;
  const opponentColor = playerColor === "white" ? "black" : "white";
  const turnLabel = active ? (game.currentPlayer === playerColor ? "Your turn" : "Opponent turn") : "Waiting for friend";

  return (
    <div
      className="min-h-screen bg-[#efe9dc]"
      style={{
        backgroundImage: `linear-gradient(rgba(239,233,220,0.92),rgba(239,233,220,0.92)),url('${vibeRoom.backgroundImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <header className="border-b border-[#d6cdbd] bg-[#f8f6ee]/85 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-[#2a3041]">
              <ArrowLeft className="h-5 w-5" />
              Back
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge className="border-[#d8ccb8] bg-[#edf5e1] text-[#5d8f49]">Friend Room</Badge>
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#6e6a5d]">Room {room.roomId}</Badge>
              <Badge className="border-[#d8ccb8] bg-[#f4efe3] text-[#6e6a5d]">You are {playerColor.toUpperCase()}</Badge>
              <Badge className="border-[#d8ccb8] bg-[#f4efe3] text-[#6e6a5d]">Opponent {opponentColor.toUpperCase()}</Badge>
              <Badge className="border-[#d8ccb8] bg-[#edf5e1] text-[#5d8f49]">{turnLabel}</Badge>
              {subscription.isActive ? (
                <Badge className="border-[#a7c994] bg-[#edf6e5] text-[#5d8f49]">
                  Pro active · {formatTrialRemaining(subscription.remainingMs)}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <Container className="py-6 lg:py-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section className="space-y-4">
            {!active ? (
              <Panel className="space-y-5 border-[#d9ccb8] bg-[#fffaf3]/95 p-6 text-center shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#edf5e1]">
                  <Users className="h-10 w-10 text-[#5d8f49]" />
                </div>
                <h1 className="text-4xl font-semibold text-[#1f2639]">Share this link with a friend</h1>
                <p className="text-lg text-[#6f7480]">
                  {waitingForOpponent ? "Waiting for opponent..." : "The room is ready."}
                </p>
                <div className="grid gap-3 text-left sm:grid-cols-3">
                  <InfoTile label="Your side" value={playerColor.toUpperCase()} />
                  <InfoTile label="Opponent side" value={waitingForOpponent ? "Waiting" : opponentColor.toUpperCase()} />
                  <InfoTile label="Current turn" value={turnLabel} />
                </div>
                <div className="rounded-2xl border border-[#d8ccb8] bg-[#f7f2e6] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#6e6a5d]">Room ID</p>
                  <p className="mt-1 text-2xl font-semibold text-[#1f2639]">{room.roomId}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={copyInviteLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied invite link" : "Copy Invite Link"}
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => router.refresh()}>
                    Refresh Room
                  </Button>
                </div>
                <div className="rounded-2xl border border-[#d8ccb8] bg-[#fff6e4] px-4 py-3 text-left text-sm text-[#5f665b]">
                  <p className="font-semibold text-[#1f2639]">Waiting room</p>
                  <p className="mt-1">Share the URL and keep this tab open. The same browser will sync through localStorage and BroadcastChannel.</p>
                </div>
                {!hasSupabaseConfig() ? (
                  <div className="rounded-2xl border border-[#e2d0a5] bg-[#fbf0d8] px-4 py-3 text-left text-sm text-[#8d6a2b]">
                    {getSupabaseSetupMessage("friend room sync and profile persistence")}
                  </div>
                ) : null}
              </Panel>
            ) : (
              <GameBoard boardOnly={false} vibeRoom={activeRoomKey} />
            )}
          </section>

          <aside className="space-y-4">
            <Panel className="space-y-3 border-[#d9ccb8] bg-[#fffaf3]/95 p-5 shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Room Status</p>
              <h2 className="text-2xl font-semibold text-[#1f2639]">
                {room.status === "active" ? "Opponent joined" : "Waiting for opponent"}
              </h2>
              <p className="text-sm leading-6 text-[#6f7480]">
                {room.createdBy === user.id
                  ? "You created this room. Copy the link and start the match when the second player joins."
                  : "You joined as the second player. When the host is ready, the board will sync here."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#1f2639]">White: {room.playerWhite ? "Assigned" : "Open"}</Badge>
                <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#1f2639]">Black: {room.playerBlack ? "Assigned" : "Open"}</Badge>
                <Badge className="border-[#d8ccb8] bg-[#edf5e1] text-[#5d8f49]">Sync: local room state</Badge>
                <Badge className="border-[#d8ccb8] bg-[#f4efe3] text-[#6e6a5d]">Player {playerColor.toUpperCase()}</Badge>
              </div>
            </Panel>

            <Panel className="space-y-3 border-[#d9ccb8] bg-[#fffaf3]/95 p-5 shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Invite</p>
              <h3 className="text-xl font-semibold text-[#1f2639]">Room link</h3>
              <div className="rounded-2xl border border-[#d8ccb8] bg-[#f7f2e6] px-4 py-3 text-sm text-[#5f665b]">
                {inviteUrl}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={copyInviteLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => setRoom(getLocalRoom(roomId))}>
                  Reload
                </Button>
              </div>
            </Panel>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8ccb8] bg-[#f7f2e6] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-[#6e6a5d]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1f2639]">{value}</p>
    </div>
  );
}
