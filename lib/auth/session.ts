import type { SessionState } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchProfileClientWithDefaults } from "@/lib/data/profile-client";
import { getSubscriptionSnapshot } from "@/lib/data/subscription-client";
import { mapSupabaseSession } from "@/lib/auth/shared";

export async function signIn(email: string, password: string): Promise<SessionState> {
  const response = await postAuth<{
    session: SessionState | null;
    error?: string;
  }>("/api/auth/login", { email, password });

  if (!response.session) {
    throw new Error(response.error ?? "Could not sign in.");
  }

  await persistBrowserSession(response.session);
  const session = await enrichSession(response.session);
  if (!session) {
    throw new Error("Could not establish a session after signing in.");
  }
  return session;
}

export async function signUp(email: string, password: string, displayName: string): Promise<SessionState> {
  const response = await postAuth<{
    session: SessionState | null;
    needsEmailConfirmation?: boolean;
    message?: string;
    error?: string;
  }>("/api/auth/signup", { email, password, displayName });

  if (!response.session) {
    throw new Error(
      response.message ??
        response.error ??
        "Account created, but the session is not active yet. Check your email to confirm the address."
    );
  }

  await persistBrowserSession(response.session);
  const session = await enrichSession(response.session);
  if (!session) {
    throw new Error("Could not establish a session after signing up.");
  }
  return session;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Ignore backend sign-out failures and still clear local demo/session state.
  }
}

export async function bootstrapAuth(
  onSession: (session: SessionState | null) => void,
  onHydrated: () => void
) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    onHydrated();
    return () => undefined;
  }

  const { data } = await supabase.auth.getSession();
  const initialSession = await enrichSession(mapSupabaseSession(data.session));
  onSession(initialSession);
  onHydrated();

  const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const mapped = await enrichSession(mapSupabaseSession(session));
    onSession(mapped);
  });
  return () => {
    listener.subscription.unsubscribe();
  };
}

async function enrichSession(session: SessionState | null) {
  if (!session?.user) return session;
  return syncSessionWithProfile(session);
}

async function persistBrowserSession(session: SessionState) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !session.accessToken) {
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken ?? ""
  });
  if (error) {
    throw error;
  }
}

async function syncSessionWithProfile(session: SessionState): Promise<SessionState> {
  if (!session.user) return session;
  const profile = await fetchProfileClientWithDefaults(session.user.id, session.user.email, {
    username: session.user.displayName,
    city: session.user.city,
    avatar_url: session.user.avatarUrl ?? null
  });
  const subscription = getSubscriptionSnapshot(profile);
  const nextSession: SessionState = {
    ...session,
    user: {
      ...session.user,
      displayName: profile.username ?? session.user.displayName,
      city: profile.city ?? session.user.city,
      avatarUrl: profile.avatar_url ?? session.user.avatarUrl ?? null,
      pro: subscription.isActive,
      proUntil: subscription.endsAt
    }
  };
  return nextSession;
}

async function postAuth<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Authentication request failed.");
  }

  return payload;
}
