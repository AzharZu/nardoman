import type { Profile } from "@/lib/types";

const STORAGE_KEY_PREFIX = "backgammon-rush-subscription-";

export type StoredSubscription = Pick<
  Profile,
  "subscription_status" | "trial_started_at" | "trial_ends_at" | "pro_until"
>;

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function readStoredLocalSubscription(userId: string): StoredSubscription | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(storageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      subscription_status: parsed.subscription_status ?? "free",
      trial_started_at: typeof parsed.trial_started_at === "undefined" ? null : parsed.trial_started_at ?? null,
      trial_ends_at: typeof parsed.trial_ends_at === "undefined" ? null : parsed.trial_ends_at ?? null,
      pro_until: typeof parsed.pro_until === "undefined" ? null : parsed.pro_until ?? null
    };
  } catch {
    return null;
  }
}

export function storeLocalSubscription(userId: string, profile: StoredSubscription) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(profile));
}
