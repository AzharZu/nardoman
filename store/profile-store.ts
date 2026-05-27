import { create } from "zustand";
import type { Profile } from "@/lib/types";
import { fetchProfileClient, getLocalProfileSnapshot, updateProfileClient } from "@/lib/data/profile-client";

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  loadProfile: (userId: string, email: string, force?: boolean) => Promise<void>;
  syncProfileFromLocal: (userId: string, email: string) => void;
  updateProfile: (
    userId: string,
    email: string,
    patch: Partial<Pick<Profile, "username" | "city" | "avatar_url" | "playstyle" | "favorite_vibe_room" | "rating" | "wins" | "losses" | "level">>
  ) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  async loadProfile(userId, email, force = false) {
    const existing = get().profile;
    if (existing && existing.id === userId && !force) return;
    set({ profile: getLocalProfileSnapshot(userId, email), loading: true, error: null });
    try {
      const profile = await fetchProfileClient(userId, email, force);
      set({ profile, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: (error as Error).message ?? "Failed to load profile."
      });
    }
  },
  syncProfileFromLocal(userId, email) {
    set({
      profile: getLocalProfileSnapshot(userId, email),
      loading: false,
      error: null
    });
  },
  async updateProfile(userId, email, patch) {
    set({ loading: true, error: null });
    try {
      const profile = await updateProfileClient(userId, email, patch);
      set({ profile, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: (error as Error).message ?? "Failed to update profile."
      });
    }
  }
}));
