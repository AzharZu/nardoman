import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/backend";
import type { RoomGamePayload } from "@/lib/data/room-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlayerColor } from "@/lib/types";

type RoomRow = {
  id: string;
  created_by: string;
  player_white_id: string | null;
  player_black_id: string | null;
  status: "waiting" | "active" | "finished";
  snapshot: RoomGamePayload | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
};

type RoomResponse = {
  room: {
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
  };
};

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Room backend is not configured." }, { status: 503 });
  }

  const authUser = await getAuthenticatedUser(request, supabase);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: room, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error || !room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const roomRow = room as RoomRow;
  if (!isParticipant(roomRow, authUser.id)) {
    return NextResponse.json({ error: "You are not part of this room." }, { status: 403 });
  }

  return NextResponse.json({
    room: await buildRoomResponse(supabase, roomRow, authUser.id)
  } satisfies RoomResponse);
}

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Room backend is not configured." }, { status: 503 });
  }

  const authUser = await getAuthenticatedUser(request, supabase);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    side?: PlayerColor | "random";
    snapshot?: RoomGamePayload;
  } | null;

  const roomSide = normalizeSide(body?.side);

  const { data: existingRoom, error: roomError } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (roomError) {
    return NextResponse.json({ error: "Could not load the room." }, { status: 500 });
  }

  if (body?.snapshot) {
    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const roomRow = existingRoom as RoomRow;
    if (!isParticipant(roomRow, authUser.id)) {
      return NextResponse.json({ error: "You are not part of this room." }, { status: 403 });
    }

    const nextStatus: RoomRow["status"] =
      body.snapshot.game.status === "finished" ? "finished" : roomRow.status === "finished" ? "finished" : "active";

    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        snapshot: body.snapshot,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", roomId)
      .select("*")
      .maybeSingle();

    if (updateError || !updatedRoom) {
      return NextResponse.json({ error: "Could not save the room snapshot." }, { status: 500 });
    }

    return NextResponse.json({
      room: await buildRoomResponse(supabase, updatedRoom as RoomRow, authUser.id)
    } satisfies RoomResponse);
  }

  const room = await ensureRoomJoin(supabase, roomId, authUser.id, roomSide, existingRoom as RoomRow | null);
  if (!room) {
    return NextResponse.json({ error: "Unable to join this room." }, { status: 409 });
  }

  return NextResponse.json({
    room: await buildRoomResponse(supabase, room, authUser.id)
  } satisfies RoomResponse);
}

function normalizeSide(side?: string): PlayerColor | "random" {
  if (side === "black" || side === "white" || side === "random") {
    return side;
  }
  return "white";
}

function isParticipant(room: RoomRow, userId: string) {
  return room.created_by === userId || room.player_white_id === userId || room.player_black_id === userId;
}

async function ensureRoomJoin(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  roomId: string,
  userId: string,
  side: PlayerColor | "random",
  existingRoom: RoomRow | null
) {
  const now = new Date().toISOString();
  const currentRoom = existingRoom;

  if (!currentRoom) {
    const resolvedSide = side === "random" ? (Math.random() > 0.5 ? "white" : "black") : side;
    const newRoom: Partial<RoomRow> = {
      id: roomId,
      created_by: userId,
      player_white_id: resolvedSide === "white" ? userId : null,
      player_black_id: resolvedSide === "black" ? userId : null,
      status: "waiting",
      snapshot: null,
      created_at: now,
      updated_at: now
    };

    const { data: inserted, error } = await supabase.from("rooms").upsert(newRoom, { onConflict: "id" }).select("*").maybeSingle();
    if (error || !inserted) {
      return null;
    }

    await upsertFriendMatchRow(supabase, inserted as RoomRow);
    return inserted as RoomRow;
  }

  if (currentRoom.status === "finished") {
    return currentRoom;
  }

  if (isParticipant(currentRoom, userId)) {
    const { data: refreshed, error } = await supabase
      .from("rooms")
      .update({
        updated_at: now,
        status: currentRoom.player_white_id && currentRoom.player_black_id ? "active" : "waiting"
      })
      .eq("id", roomId)
      .select("*")
      .maybeSingle();

    if (error || !refreshed) {
      return currentRoom;
    }

    await upsertFriendMatchRow(supabase, refreshed as RoomRow);
    return refreshed as RoomRow;
  }

  if (currentRoom.status !== "waiting") {
    return null;
  }

  let nextRoom: RoomRow = currentRoom;
  if (!currentRoom.player_white_id) {
    nextRoom = {
      ...currentRoom,
      player_white_id: userId,
      status: currentRoom.player_black_id ? "active" : "waiting",
      updated_at: now
    };
  } else if (!currentRoom.player_black_id) {
    nextRoom = {
      ...currentRoom,
      player_black_id: userId,
      status: currentRoom.player_white_id ? "active" : "waiting",
      updated_at: now
    };
  } else {
    return null;
  }

  const { data: updated, error } = await supabase
    .from("rooms")
    .update({
      player_white_id: nextRoom.player_white_id,
      player_black_id: nextRoom.player_black_id,
      status: nextRoom.status,
      updated_at: nextRoom.updated_at
    })
    .eq("id", roomId)
    .select("*")
    .maybeSingle();
  if (error || !updated) {
    return null;
  }

  await upsertFriendMatchRow(supabase, updated as RoomRow);
  return updated as RoomRow;
}

async function upsertFriendMatchRow(supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>, room: RoomRow) {
  await supabase.from("matches").upsert({
    id: room.id,
    mode: "friend",
    player_white_id: room.player_white_id,
    player_black_id: room.player_black_id,
    room_id: room.id,
    status: room.status,
    started_at: room.created_at
  });
}

async function buildRoomResponse(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  room: RoomRow,
  userId: string
) {
  const [whiteName, blackName] = await Promise.all([
    room.player_white_id ? getProfileName(supabase, room.player_white_id) : Promise.resolve(null),
    room.player_black_id ? getProfileName(supabase, room.player_black_id) : Promise.resolve(null)
  ]);

  const currentUserColor: PlayerColor =
    room.player_white_id === userId ? "white" : room.player_black_id === userId ? "black" : "white";

  return {
    roomId: room.id,
    createdBy: room.created_by,
    playerWhiteId: room.player_white_id,
    playerBlackId: room.player_black_id,
    playerWhiteName: whiteName,
    playerBlackName: blackName,
    status: room.status,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
    snapshot: room.snapshot ?? null,
    playerColor: currentUserColor,
    opponentId: currentUserColor === "white" ? room.player_black_id : room.player_white_id,
    opponentName: currentUserColor === "white" ? blackName : whiteName
  };
}

async function getProfileName(supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data, error } = await supabase.from("profiles").select("id, username").eq("id", userId).maybeSingle();
  if (error || !data) {
    return null;
  }
  const row = data as ProfileRow;
  return row.username ?? null;
}
