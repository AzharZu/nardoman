import type { MatchMode, PlayerColor } from "@/lib/types";
import type { StoreSnapshot } from "@/store/game-store";

const STORAGE_KEY_PREFIX = "backgammon-rush-room-";
const SNAPSHOT_KEY_PREFIX = "backgammon-rush-room-snapshot-";
const CHANNEL_PREFIX = "backgammon-rush-room-channel-";

export interface RoomState {
  roomId: string;
  createdBy: string;
  playerWhite: string | null;
  playerBlack: string | null;
  status: "waiting" | "active" | "finished";
  createdAt: string;
  updatedAt: string;
}

export interface RoomGamePayload extends Omit<StoreSnapshot, "playerColor"> {
  roomId: string;
  updatedAt: string;
}

type RoomMessage = RoomGamePayload | { type: "room-update"; room: RoomState };

export function createRoomId(): string {
  return `room_${Math.random().toString(36).slice(2, 10)}`;
}

export function createLocalRoom(roomId: string, userId: string, hostSide: PlayerColor | "random" = "white"): RoomState {
  const resolvedSide: PlayerColor =
    hostSide === "random" ? (Math.random() > 0.5 ? "white" : "black") : hostSide;
  const room: RoomState = {
    roomId,
    createdBy: userId,
    playerWhite: resolvedSide === "white" ? userId : null,
    playerBlack: resolvedSide === "black" ? userId : null,
    status: "waiting",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  persistRoom(room);
  return room;
}

export function upsertLocalRoom(room: RoomState) {
  persistRoom(room);
  return room;
}

export function getLocalRoom(roomId: string): RoomState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + roomId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    return null;
  }
}

export function ensureLocalRoom(roomId: string, userId: string): RoomState {
  const existing = getLocalRoom(roomId);
  if (!existing) {
    return createLocalRoom(roomId, userId);
  }
  return existing;
}

export function joinLocalRoom(roomId: string, userId: string): RoomState | null {
  const room = getLocalRoom(roomId);
  if (!room) return null;
  if (room.playerWhite === userId || room.playerBlack === userId) {
    return room;
  }
  if (room.status !== "waiting") return null;
  if (room.playerWhite && room.playerBlack) return room;

  const updated: RoomState = {
    ...room,
    playerWhite: room.playerWhite ?? userId,
    playerBlack: room.playerBlack ?? userId,
    status: room.playerWhite && room.playerBlack ? "active" : room.playerWhite ? "active" : room.playerBlack ? "active" : "waiting",
    updatedAt: new Date().toISOString()
  };
  persistRoom(updated);
  return updated;
}

export function getPlayerColorForRoom(room: RoomState, userId: string): PlayerColor {
  return room.playerWhite === userId ? "white" : "black";
}

export function saveRoomSnapshot(snapshot: RoomGamePayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SNAPSHOT_KEY_PREFIX + snapshot.roomId, JSON.stringify(snapshot));
  postRoomMessage(snapshot.roomId, snapshot);
}

export function loadRoomSnapshot(roomId: string): RoomGamePayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SNAPSHOT_KEY_PREFIX + roomId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomGamePayload;
  } catch {
    return null;
  }
}

export function subscribeRoomSnapshot(roomId: string, onSnapshot: (snapshot: RoomGamePayload | null) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SNAPSHOT_KEY_PREFIX + roomId) {
      onSnapshot(loadRoomSnapshot(roomId));
    }
    if (event.key === STORAGE_KEY_PREFIX + roomId) {
      const room = getLocalRoom(roomId);
      if (room) {
        onSnapshot(loadRoomSnapshot(roomId));
      }
    }
  };

  const channel = getRoomChannel(roomId);
  const handleMessage = (event: MessageEvent<RoomMessage>) => {
    const data = event.data as RoomMessage | null;
    if (!data) return;
    if ("roomId" in data && data.roomId === roomId) {
      onSnapshot(data as RoomGamePayload);
      return;
    }
    if ("room" in data && data.room?.roomId === roomId) {
      onSnapshot(loadRoomSnapshot(roomId));
    }
  };

  window.addEventListener("storage", handleStorage);
  channel?.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.removeEventListener("message", handleMessage);
    channel?.close();
  };
}

export function cleanupRoom(roomId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX + roomId);
    window.localStorage.removeItem(SNAPSHOT_KEY_PREFIX + roomId);
  }
}

export function readRoomMoveMode() {
  return "friend" as MatchMode;
}

export function updateRoomActivity(roomId: string, status: RoomState["status"]) {
  const room = getLocalRoom(roomId);
  if (!room) return null;
  const updated: RoomState = { ...room, status, updatedAt: new Date().toISOString() };
  persistRoom(updated);
  return updated;
}

function persistRoom(room: RoomState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_PREFIX + room.roomId, JSON.stringify(room));
  postRoomMessage(room.roomId, { type: "room-update", room });
}

function getRoomChannel(roomId: string) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_PREFIX + roomId);
}

function postRoomMessage(roomId: string, message: unknown) {
  const channel = getRoomChannel(roomId);
  channel?.postMessage(message);
  channel?.close();
}
