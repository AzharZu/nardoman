import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeProfileRow } from "@/lib/data/profile-client";
import { getAuthenticatedUser } from "@/lib/auth/backend";

type ProfilePatch = {
  username?: string;
  city?: string;
  avatar_url?: string | null;
  playstyle?: string;
  favorite_vibe_room?: string | null;
  subscription_status?: string;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  pro_until?: string | null;
  rating?: number;
  wins?: number;
  losses?: number;
  level?: number;
};

function buildDefaultProfile(userId: string, email: string, displayName?: string) {
  return {
    id: userId,
    email,
    display_name: displayName ?? (email.split("@")[0] || "Player"),
    city: "Almaty",
    avatar_url: null,
    level: 1,
    rating: 1200,
    wins: 0,
    losses: 0,
    favorite_vibe_room: "grass-picnic",
    subscription_status: "free",
    trial_started_at: null,
    trial_ends_at: null,
    pro_until: null
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";
  const displayName = url.searchParams.get("displayName")?.trim() || undefined;

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Profile backend is not configured." }, { status: 503 });
  }

  const authUser = await getAuthenticatedUser(request, supabase);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (authUser.id !== userId) {
    return NextResponse.json({ error: "You can only access your own profile." }, { status: 403 });
  }

  const email = authUser.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Authenticated user email is missing." }, { status: 400 });
  }

  const { data: existing, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!error && existing) {
    return NextResponse.json({
      profile: normalizeProfileRow(existing as Record<string, unknown>, userId, email)
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .upsert(buildDefaultProfile(userId, email, displayName), { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (insertError || !inserted) {
    const fallbackProfile = {
      ...buildDefaultProfile(userId, email, displayName)
    } as Parameters<typeof normalizeProfileRow>[0];
    return NextResponse.json({
      profile: normalizeProfileRow(fallbackProfile, userId, email)
    });
  }

  return NextResponse.json({
    profile: normalizeProfileRow(inserted as Record<string, unknown>, userId, email)
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    email?: string;
    patch?: ProfilePatch;
  } | null;

  const userId = body?.userId?.trim() ?? "";
  const patch = body?.patch ?? {};

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Profile backend is not configured." }, { status: 503 });
  }

  const authUser = await getAuthenticatedUser(request, supabase);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (authUser.id !== userId) {
    return NextResponse.json({ error: "You can only edit your own profile." }, { status: 403 });
  }

  const email = authUser.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Authenticated user email is missing." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (typeof patch.username !== "undefined") updatePayload.display_name = patch.username;
  if (typeof patch.city !== "undefined") updatePayload.city = patch.city;
  if (typeof patch.avatar_url !== "undefined") updatePayload.avatar_url = patch.avatar_url;
  if (typeof patch.playstyle !== "undefined") updatePayload.playstyle = patch.playstyle;
  if (typeof patch.favorite_vibe_room !== "undefined") updatePayload.favorite_vibe_room = patch.favorite_vibe_room;
  if (typeof patch.subscription_status !== "undefined") updatePayload.subscription_status = patch.subscription_status;
  if (typeof patch.trial_started_at !== "undefined") updatePayload.trial_started_at = patch.trial_started_at;
  if (typeof patch.trial_ends_at !== "undefined") updatePayload.trial_ends_at = patch.trial_ends_at;
  if (typeof patch.pro_until !== "undefined") updatePayload.pro_until = patch.pro_until;
  if (typeof patch.rating !== "undefined") updatePayload.rating = patch.rating;
  if (typeof patch.wins !== "undefined") updatePayload.wins = patch.wins;
  if (typeof patch.losses !== "undefined") updatePayload.losses = patch.losses;
  if (typeof patch.level !== "undefined") updatePayload.level = patch.level;

  const { data: existing, error: existingError } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!existingError && existing) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        profile: normalizeProfileRow(data as Record<string, unknown>, userId, email)
      });
    }
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        ...buildDefaultProfile(userId, email, patch.username),
        ...updatePayload,
        id: userId,
        email
      },
      { onConflict: "id" }
    )
    .select("*")
    .maybeSingle();

  if (upsertError || !upserted) {
    const fallbackProfile = {
      ...buildDefaultProfile(userId, email, patch.username),
      ...updatePayload
    } as Parameters<typeof normalizeProfileRow>[0];
    return NextResponse.json({
      profile: normalizeProfileRow(fallbackProfile, userId, email)
    });
  }

  return NextResponse.json({
    profile: normalizeProfileRow(upserted as Record<string, unknown>, userId, email)
  });
}
