import { getSupabaseAccessToken } from "@/lib/auth/browser";
import type { PlayerColor } from "@/lib/types";
import type { RoomGamePayload } from "@/lib/data/room-client";

export interface RemoteRoomParticipant {
  id: string | null;
  displayName: string | null;
}

export interface RemoteRoomSession {
  roomId: string;
  createdBy: string;
  playerWhiteId: string | null;
  playerBlackId: string | null;
  playerWhiteName: string | null;
  playerBlackName: string | null;
  status: "waiting" | "active" | "finished";
  createdAt: string;
  updatedAt: string;
  snapshot: RoomGamePayload | null;
  playerColor: PlayerColor;
  opponentId: string | null;
  opponentName: string | null;
}

type RemoteRoomResponse = {
  room: RemoteRoomSession;
};

function getRoomRequestHeaders(token: string | null) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function requestRoomSession(
  roomId: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>
): Promise<RemoteRoomSession> {
  const token = await getSupabaseAccessToken();
  const response = await fetch(`/api/rooms/${roomId}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...getRoomRequestHeaders(token)
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = (await response.json().catch(() => null)) as RemoteRoomResponse | { error?: string } | null;
  if (!response.ok || !payload || !("room" in payload)) {
    const message =
      payload && "error" in payload && payload.error
        ? payload.error
        : "Unable to load the friend room.";
    throw new Error(message);
  }

  return payload.room;
}

export async function ensureRemoteRoom(roomId: string, side?: PlayerColor | "random") {
  return requestRoomSession(roomId, "POST", { side });
}

export async function fetchRemoteRoom(roomId: string) {
  try {
    return await requestRoomSession(roomId, "GET");
  } catch {
    return null;
  }
}

export async function saveRemoteRoomSnapshot(roomId: string, snapshot: RoomGamePayload) {
  return requestRoomSession(roomId, "POST", { snapshot });
}
