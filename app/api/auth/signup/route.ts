import { NextResponse } from "next/server";
import { createSupabaseAuthBackendClient, ensureAuthProfile, ensureConfirmedAuthUser } from "@/lib/auth/backend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapSupabaseSession } from "@/lib/auth/shared";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    displayName?: string;
  } | null;

  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";
  const displayName = body?.displayName?.trim() ?? "";

  if (!email || !password || !displayName) {
    return NextResponse.json({ error: "Display name, email, and password are required." }, { status: 400 });
  }

  const supabase = createSupabaseAuthBackendClient();
  const adminSupabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Authentication backend is not configured." }, { status: 503 });
  }

  if (adminSupabase) {
    const user = await ensureConfirmedAuthUser(adminSupabase, { email, password, displayName });
    if (!user) {
      return NextResponse.json({ error: "Could not create the account." }, { status: 400 });
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create the account." },
      { status: 400 }
    );
  }

  await ensureAuthProfile(data.user, displayName);

  return NextResponse.json({ session: mapSupabaseSession(data.session) });
}
