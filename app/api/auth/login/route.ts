import { NextResponse } from "next/server";
import { createSupabaseAuthBackendClient, confirmAuthUserEmail, ensureAuthProfile } from "@/lib/auth/backend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapSupabaseSession } from "@/lib/auth/shared";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = createSupabaseAuthBackendClient();
  if (!supabase) {
    return NextResponse.json({ error: "Authentication backend is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    const adminSupabase = createSupabaseServerClient();
    if (error?.message?.toLowerCase().includes("email not confirmed") && (await confirmAuthUserEmail(adminSupabase, { email, password }))) {
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (!retry.error && retry.data.user && retry.data.session) {
        await ensureAuthProfile(retry.data.user, retry.data.user.user_metadata?.display_name ?? undefined);
        return NextResponse.json({
          session: mapSupabaseSession(retry.data.session)
        });
      }
    }

    return NextResponse.json(
      { error: error?.message ?? "Could not sign in with the provided credentials." },
      { status: 401 }
    );
  }

  await ensureAuthProfile(data.user, data.user.user_metadata?.display_name ?? undefined);

  return NextResponse.json({
    session: mapSupabaseSession(data.session)
  });
}
