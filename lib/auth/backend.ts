import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getOrCreateProfile } from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
}

export function createSupabaseAuthBackendClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export async function ensureAuthProfile(user: User, displayName?: string) {
  const email = user.email ?? "";
  return getOrCreateProfile(user.id, email, displayName ?? user.user_metadata?.display_name ?? undefined);
}

export async function getAuthenticatedUser(
  request: Request,
  adminSupabase: ReturnType<typeof createSupabaseServerClient>
) {
  if (!adminSupabase) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function findAuthUserByEmail(
  adminSupabase: ReturnType<typeof createSupabaseServerClient>,
  email: string
) {
  if (!adminSupabase) return null;

  const normalizedEmail = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return null;

    const user = data.users.find((item: User) => item.email?.trim().toLowerCase() === normalizedEmail);
    if (user) return user;
    if (!data.users.length || !data.nextPage) return null;
  }

  return null;
}

export async function ensureConfirmedAuthUser(
  adminSupabase: ReturnType<typeof createSupabaseServerClient>,
  params: { email: string; password: string; displayName: string }
) {
  if (!adminSupabase) return null;

  const existing = await findAuthUserByEmail(adminSupabase, params.email);
  if (existing) {
    const { data, error } = await adminSupabase.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password: params.password,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        display_name: params.displayName
      }
    });

    if (!error && data.user) {
      return data.user;
    }
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      display_name: params.displayName
    }
  });

  if (error) return null;
  return data.user;
}

export async function confirmAuthUserEmail(
  adminSupabase: ReturnType<typeof createSupabaseServerClient>,
  params: { email: string; password: string; displayName?: string }
) {
  if (!adminSupabase) return false;

  const existing = await findAuthUserByEmail(adminSupabase, params.email);
  if (!existing) return false;

  const existingMetadata = (existing.user_metadata ?? {}) as { display_name?: string };
  const { error } = await adminSupabase.auth.admin.updateUserById(existing.id, {
    email_confirm: true,
    password: params.password,
    user_metadata: {
      ...(existing.user_metadata ?? {}),
      display_name: params.displayName ?? existingMetadata.display_name ?? params.email.split("@")[0] ?? "Player"
    }
  });

  return !error;
}
