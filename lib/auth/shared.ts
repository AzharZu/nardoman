import type { Session, User } from "@supabase/supabase-js";
import type { AppUser, SessionState } from "@/lib/types";

export function mapSupabaseSession(session: Session | null): SessionState | null {
  if (!session?.user) {
    return null;
  }

  const profile = session.user.user_metadata ?? {};
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      displayName: profile.display_name ?? session.user.email ?? "Player",
      city: profile.city ?? "Almaty",
      avatarUrl: profile.avatar_url ?? null,
      pro: Boolean(profile.pro),
      proUntil: profile.pro_until ?? null,
      createdAt: session.user.created_at
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? null,
    expiresAt: session.expires_at ? session.expires_at * 1000 : null
  };
}

export function mapUserToAppUser(user: User, fallbackDisplayName?: string): AppUser {
  const profile = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile.display_name ?? fallbackDisplayName ?? user.email ?? "Player",
    city: profile.city ?? "Almaty",
    avatarUrl: profile.avatar_url ?? null,
    pro: Boolean(profile.pro),
    proUntil: profile.pro_until ?? null,
    createdAt: user.created_at
  };
}
