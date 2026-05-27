import type { AppUser, Profile, SubscriptionStatus, PurchaseRecord } from "@/lib/types";
import { ensureProfileClientRecord, fetchProfileClient, updateProfileClient } from "@/lib/data/profile-client";
import { storeLocalSubscription } from "@/lib/data/subscription-cache";
import { getSupabaseAccessToken } from "@/lib/auth/browser";
const TRIAL_DURATION_MS = 2 * 60 * 60 * 1000;

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  isActive: boolean;
  startedAt: string | null;
  endsAt: string | null;
  remainingMs: number;
  source: "free" | "trial" | "pro";
}

function nowIso() {
  return new Date().toISOString();
}

export function getSubscriptionSnapshot(profile?: Profile | null): SubscriptionSnapshot {
  const trialEndsAt = profile?.trial_ends_at ?? null;
  const proUntil = profile?.pro_until ?? null;
  const now = Date.now();
  const trialRemaining = trialEndsAt ? new Date(trialEndsAt).getTime() - now : 0;
  const proRemaining = proUntil ? new Date(proUntil).getTime() - now : 0;
  const isTrialActive = trialRemaining > 0;
  const isProActive = proRemaining > 0;

  if (isProActive) {
    return {
      status: "pro",
      isActive: true,
      startedAt: profile?.trial_started_at ?? null,
      endsAt: proUntil,
      remainingMs: proRemaining,
      source: "pro"
    };
  }

  if (isTrialActive) {
    return {
      status: "trial",
      isActive: true,
      startedAt: profile?.trial_started_at ?? null,
      endsAt: trialEndsAt,
      remainingMs: trialRemaining,
      source: "trial"
    };
  }

  return {
    status: profile?.subscription_status === "trial" ? "expired" : profile?.subscription_status ?? "free",
    isActive: false,
    startedAt: profile?.trial_started_at ?? null,
    endsAt: trialEndsAt ?? proUntil,
    remainingMs: 0,
    source: "free"
  };
}

export function getEffectiveSubscriptionSnapshot(profile?: Profile | null, user?: Pick<AppUser, "pro" | "proUntil"> | null): SubscriptionSnapshot {
  const snapshot = getSubscriptionSnapshot(profile);
  if (snapshot.isActive) return snapshot;

  if (user?.proUntil) {
    const remainingMs = new Date(user.proUntil).getTime() - Date.now();
    if (remainingMs > 0) {
      return {
        status: "pro",
        isActive: true,
        startedAt: profile?.trial_started_at ?? null,
        endsAt: user.proUntil,
        remainingMs,
        source: "pro"
      };
    }
  }

  if (user?.pro) {
    return {
      status: "pro",
      isActive: true,
      startedAt: profile?.trial_started_at ?? null,
      endsAt: user?.proUntil ?? profile?.pro_until ?? profile?.trial_ends_at ?? null,
      remainingMs: 0,
      source: "pro"
    };
  }

  return snapshot;
}

export function formatTrialRemaining(remainingMs: number) {
  if (remainingMs <= 0) return "00:00";
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatSubscriptionDeadline(value: string | null, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export async function syncSubscriptionFromProfile(userId: string, email: string): Promise<Profile> {
  const profile = await fetchProfileClient(userId, email);
  storeLocalSubscription(userId, {
    subscription_status: profile.subscription_status,
    trial_started_at: profile.trial_started_at,
    trial_ends_at: profile.trial_ends_at,
    pro_until: profile.pro_until
  });
  return profile;
}

export async function startTrialClient(userId: string, email: string): Promise<Profile> {
  if (typeof window !== "undefined") {
    try {
      const accessToken = await getSupabaseAccessToken();
      const response = await fetch("/api/subscription/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ userId, email })
      });

      const payload = (await response.json().catch(() => null)) as { profile?: Profile; error?: string } | null;

      if (response.ok && payload?.profile) {
        const syncedProfile = await ensureProfileClientRecord(userId, email, {
          subscription_status: payload.profile.subscription_status,
          trial_started_at: payload.profile.trial_started_at,
          trial_ends_at: payload.profile.trial_ends_at,
          pro_until: payload.profile.pro_until
        });
        storeLocalSubscription(userId, {
          subscription_status: syncedProfile.subscription_status,
          trial_started_at: syncedProfile.trial_started_at,
          trial_ends_at: syncedProfile.trial_ends_at,
          pro_until: syncedProfile.pro_until
        });
        return syncedProfile;
      }

      if (response.status === 503) {
        // Fall through to the local path when the backend is unavailable.
      } else {
        throw new Error(payload?.error ?? "This account cannot start another trial.");
      }
    } catch (error) {
      if ((error as Error)?.message !== "This account cannot start another trial.") {
        // fall back to the local path below
      } else {
        throw error;
      }
    }
  }

  const existing = await fetchProfileClient(userId, email);
  const snapshot = getSubscriptionSnapshot(existing);
  if (snapshot.isActive || existing.trial_started_at || existing.trial_ends_at || existing.pro_until || existing.subscription_status !== "free") {
    return existing;
  }

  const trialStartedAt = nowIso();
  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();
  const nextProfile = await updateProfileClient(userId, email, {
    subscription_status: "trial",
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    pro_until: trialEndsAt
  });
  const purchase: PurchaseRecord = {
    id: `trial_${userId}`,
    userId,
    plan: "pro-trial",
    amount: 0,
    currency: "USD",
    status: "trial",
    trialStartedAt,
    trialEndsAt,
    createdAt: trialStartedAt
  };

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem("backgammon-rush-purchases");
    const localPurchases = raw ? (JSON.parse(raw) as PurchaseRecord[]) : [];
    const next = [purchase, ...localPurchases.filter((item) => item.id !== purchase.id)];
    window.localStorage.setItem("backgammon-rush-purchases", JSON.stringify(next));
  }

  storeLocalSubscription(userId, {
    subscription_status: nextProfile.subscription_status,
    trial_started_at: nextProfile.trial_started_at,
    trial_ends_at: nextProfile.trial_ends_at,
    pro_until: nextProfile.pro_until
  });

  return ensureProfileClientRecord(userId, email, {
    subscription_status: nextProfile.subscription_status,
    trial_started_at: nextProfile.trial_started_at,
    trial_ends_at: nextProfile.trial_ends_at,
    pro_until: nextProfile.pro_until
  });
}
