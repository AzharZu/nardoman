import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeProfileRow } from "@/lib/data/profile-client";
import { getAuthenticatedUser } from "@/lib/auth/backend";

const TRIAL_DURATION_MS = 2 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { userId?: string; email?: string } | null;
  const userId = body?.userId?.trim() ?? "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Subscription backend is not configured." }, { status: 503 });
  }

  const authUser = await getAuthenticatedUser(request, supabase);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (authUser.id !== userId) {
    return NextResponse.json({ error: "You can only start a trial on your own account." }, { status: 403 });
  }

  const email = authUser.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Authenticated user email is missing." }, { status: 400 });
  }

  const { data: existing, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !existing) {
    return NextResponse.json(
      { error: "Finish registration first, then start the Pro trial from your account." },
      { status: 404 }
    );
  }

  const profile = normalizeProfileRow(existing as Record<string, unknown>, userId, email);
  if (profile.subscription_status !== "free" || profile.trial_started_at || profile.trial_ends_at || profile.pro_until) {
    return NextResponse.json(
      {
        error: "This account already used the Pro trial.",
        profile
      },
      { status: 409 }
    );
  }

  const trialStartedAt = new Date().toISOString();
  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();
  const nextProfile = {
    ...profile,
    subscription_status: "trial",
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    pro_until: trialEndsAt
  };

  const purchaseId = `trial_${userId}`;
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_status: nextProfile.subscription_status,
      trial_started_at: nextProfile.trial_started_at,
      trial_ends_at: nextProfile.trial_ends_at,
      pro_until: nextProfile.pro_until
    })
    .eq("id", userId);

  const { error: purchaseError } = await supabase.from("purchases").upsert({
    id: purchaseId,
    user_id: userId,
    plan: "pro-trial",
    amount: 0,
    currency: "USD",
    status: "trial",
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    created_at: trialStartedAt
  });

  if (updateError || purchaseError) {
    return NextResponse.json({ profile: nextProfile, warning: "Saved locally, but backend sync was partial." });
  }

  return NextResponse.json({ profile: nextProfile });
}
