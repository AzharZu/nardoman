import type { Profile } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { readStoredLocalSubscription } from "@/lib/data/subscription-cache";
import { getSupabaseAccessToken } from "@/lib/auth/browser";

const STORAGE_KEY_PREFIX = "backgammon-rush-profile-";

const DEFAULT_PROFILE: Omit<Profile, "id" | "email" | "created_at"> = {
  username: "Player",
  city: "Almaty",
  avatar_url: null,
  playstyle: "Tactical",
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

type EditableProfilePatch = Partial<
  Pick<
    Profile,
    | "username"
    | "city"
    | "avatar_url"
    | "playstyle"
    | "favorite_vibe_room"
    | "subscription_status"
    | "trial_started_at"
    | "trial_ends_at"
    | "pro_until"
    | "rating"
    | "wins"
    | "losses"
    | "level"
  >
>;

type ProfileRow = Partial<Profile> & {
  display_name?: string | null;
  username?: string | null;
  created_at?: string | null;
};

function getSubscriptionRemainingMs(profile: Pick<Profile, "trial_ends_at" | "pro_until">) {
  const now = Date.now();
  const trialRemaining = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() - now : 0;
  const proRemaining = profile.pro_until ? new Date(profile.pro_until).getTime() - now : 0;
  return {
    isActive: trialRemaining > 0 || proRemaining > 0,
    remainingMs: Math.max(trialRemaining, proRemaining)
  };
}

function mergeStoredSubscription(profile: Profile, userId: string): Profile {
  const storedSubscription = readStoredLocalSubscription(userId);
  if (!storedSubscription) return profile;

  const profileSnapshot = getSubscriptionRemainingMs(profile);
  const storedSnapshot = getSubscriptionRemainingMs({ ...profile, ...storedSubscription });

  if (storedSnapshot.isActive && (!profileSnapshot.isActive || storedSnapshot.remainingMs > profileSnapshot.remainingMs)) {
    return {
      ...profile,
      ...storedSubscription
    };
  }

  return profile;
}

function buildFallbackProfile(userId: string, email: string, patch?: Partial<Profile>): Profile {
  return {
    id: userId,
    email,
    created_at: new Date().toISOString(),
    ...DEFAULT_PROFILE,
    ...patch,
    username: patch?.username ?? DEFAULT_PROFILE.username ?? email.split("@")[0] ?? "Player",
    city: patch?.city ?? DEFAULT_PROFILE.city,
    playstyle: patch?.playstyle ?? DEFAULT_PROFILE.playstyle,
    subscription_status: patch?.subscription_status ?? DEFAULT_PROFILE.subscription_status,
    trial_started_at: typeof patch?.trial_started_at === "undefined" ? DEFAULT_PROFILE.trial_started_at : patch.trial_started_at ?? null,
    trial_ends_at: typeof patch?.trial_ends_at === "undefined" ? DEFAULT_PROFILE.trial_ends_at : patch.trial_ends_at ?? null,
    pro_until: typeof patch?.pro_until === "undefined" ? DEFAULT_PROFILE.pro_until : patch.pro_until ?? null
  };
}

function loadLocalProfile(userId: string, email: string): Profile {
  if (typeof window === "undefined") {
    return buildFallbackProfile(userId, email);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Profile;
      const merged = {
        ...buildFallbackProfile(userId, email),
        ...parsed,
        id: userId,
        email
      };
      return mergeStoredSubscription(merged, userId);
    } catch {
      // fall through
    }
  }

  const fallback = buildFallbackProfile(userId, email);
  window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(fallback));
  return mergeStoredSubscription(fallback, userId);
}

function readStoredLocalProfile(userId: string): Profile | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

function storeLocalProfile(profile: Profile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_PREFIX + profile.id, JSON.stringify(profile));
}

async function fetchBackendProfile(
  method: "GET" | "PATCH",
  payload: {
    userId: string;
    email: string;
    displayName?: string;
    patch?: EditableProfilePatch;
  }
): Promise<Profile | null> {
  const url = new URL("/api/profile", window.location.origin);
  const headers: Record<string, string> = {};
  const accessToken = await getSupabaseAccessToken();

  if (method === "GET") {
    url.searchParams.set("userId", payload.userId);
    url.searchParams.set("email", payload.email);
    if (payload.displayName) url.searchParams.set("displayName", payload.displayName);
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: method === "PATCH" ? JSON.stringify(payload) : undefined
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as { profile?: Profile } | null;
  return data?.profile ?? null;
}

export function normalizeProfileRow(profile: ProfileRow, userId: string, email: string): Profile {
  const username = profile.display_name ?? profile.username ?? profile.email?.split("@")[0] ?? email.split("@")[0] ?? "Player";

  return {
    ...buildFallbackProfile(userId, email, profile),
    ...profile,
    id: userId,
    email,
    username,
    city: profile.city ?? DEFAULT_PROFILE.city,
    avatar_url: profile.avatar_url ?? null,
    playstyle: profile.playstyle ?? DEFAULT_PROFILE.playstyle,
    level: typeof profile.level === "number" ? profile.level : DEFAULT_PROFILE.level,
    rating: typeof profile.rating === "number" ? profile.rating : DEFAULT_PROFILE.rating,
    wins: typeof profile.wins === "number" ? profile.wins : DEFAULT_PROFILE.wins,
    losses: typeof profile.losses === "number" ? profile.losses : DEFAULT_PROFILE.losses,
    favorite_vibe_room: profile.favorite_vibe_room ?? DEFAULT_PROFILE.favorite_vibe_room,
    subscription_status: profile.subscription_status ?? DEFAULT_PROFILE.subscription_status,
    trial_started_at: profile.trial_started_at ?? DEFAULT_PROFILE.trial_started_at,
    trial_ends_at: profile.trial_ends_at ?? DEFAULT_PROFILE.trial_ends_at,
    pro_until: profile.pro_until ?? DEFAULT_PROFILE.pro_until,
    created_at: profile.created_at ?? buildFallbackProfile(userId, email).created_at
  };
}

export function getLocalProfileSnapshot(userId: string, email: string) {
  return loadLocalProfile(userId, email);
}

export async function ensureProfileClientRecord(
  userId: string,
  email: string,
  patch: EditableProfilePatch = {}
): Promise<Profile> {
  const fallback = buildFallbackProfile(userId, email, patch);
  const storedLocal = readStoredLocalProfile(userId);
  if (storedLocal) {
    const mergedLocal = mergeStoredSubscription({ ...storedLocal, ...patch, id: userId, email } satisfies Profile, userId);
    storeLocalProfile(mergedLocal);
    return mergedLocal;
  }

  if (typeof window !== "undefined") {
    try {
      const backendProfile = await fetchBackendProfile("GET", {
        userId,
        email,
        displayName: patch.username
      });
      if (backendProfile) {
        const mergedBackend = mergeStoredSubscription(backendProfile, userId);
        storeLocalProfile(mergedBackend);
        return mergedBackend;
      }
    } catch {
      // fall back to the direct Supabase/local path below
    }
  }

  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (existing) {
      const merged = mergeStoredSubscription(normalizeProfileRow({ ...(existing as ProfileRow), ...patch }, userId, email), userId);
      storeLocalProfile(merged);
      return merged;
    }
  }

  storeLocalProfile(fallback);
  return fallback;
}

export async function fetchProfileClient(userId: string, email: string, forceFresh = false): Promise<Profile> {
  return fetchProfileClientWithDefaults(userId, email, {}, forceFresh);
}

export async function fetchProfileClientWithDefaults(
  userId: string,
  email: string,
  patch: EditableProfilePatch = {},
  forceFresh = false
): Promise<Profile> {
  if (!forceFresh) {
    const storedLocal = readStoredLocalProfile(userId);
    if (storedLocal) {
      const mergedLocal = mergeStoredSubscription({ ...storedLocal, ...patch, id: userId, email } satisfies Profile, userId);
      storeLocalProfile(mergedLocal);
      return mergedLocal;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const backendProfile = await fetchBackendProfile("GET", {
        userId,
        email,
        displayName: patch.username
      });
      if (backendProfile) {
        const merged = mergeStoredSubscription({ ...backendProfile, ...patch, id: userId, email } satisfies Profile, userId);
        storeLocalProfile(merged);
        return merged;
      }
    } catch {
      // fall through
    }
  }

  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!error && data) {
      const profile = mergeStoredSubscription(normalizeProfileRow({ ...(data as ProfileRow), ...patch }, userId, email), userId);
      storeLocalProfile(profile);
      return profile;
    }
  }

  const existing = loadLocalProfile(userId, email);
  const merged = mergeStoredSubscription({ ...existing, ...patch, id: userId, email } satisfies Profile, userId);
  storeLocalProfile(merged);
  return merged;
}

export async function updateProfileClient(
  userId: string,
  email: string,
  patch: EditableProfilePatch
): Promise<Profile> {
  if (typeof window !== "undefined") {
    try {
      const backendProfile = await fetchBackendProfile("PATCH", {
        userId,
        email,
        patch
      });
      if (backendProfile) {
        storeLocalProfile(backendProfile);
        return backendProfile;
      }
    } catch {
      // fall through
    }
  }

  const existing = loadLocalProfile(userId, email);
  const next: Profile = {
    ...existing,
    ...patch,
    id: userId,
    email
  };
  storeLocalProfile(next);
  return next;
}
