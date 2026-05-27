import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppUser, SessionState } from "@/lib/types";
import { bootstrapAuth, signIn, signOut, signUp } from "@/lib/auth/session";

interface AuthState {
  user: AppUser | null;
  expiresAt: number | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<SessionState>;
  signUp: (email: string, password: string, displayName: string) => Promise<SessionState>;
  signOut: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  hydrate: () => Promise<() => void>;
  setSession: (session: SessionState | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      expiresAt: null,
      hydrated: false,
      signIn: async (email, password) => {
        const session = await signIn(email, password);
        set({ user: session.user, expiresAt: session.expiresAt });
        return session;
      },
      signUp: async (email, password, displayName) => {
        const session = await signUp(email, password, displayName);
        set({ user: session.user, expiresAt: session.expiresAt });
        return session;
      },
      signOut: async () => {
        try {
          await signOut();
        } finally {
          set({ user: null, expiresAt: null });
        }
      },
      setUser: (user) => set({ user }),
      setSession: (session) => {
        set({ user: session?.user ?? null, expiresAt: session?.expiresAt ?? null });
      },
      hydrate: async () => {
        const cleanup = await bootstrapAuth(
          (session) => {
            set({ user: session?.user ?? null, expiresAt: session?.expiresAt ?? null });
          },
          () => set({ hydrated: true })
        );
        return cleanup;
      }
    }),
    {
      name: "backgammon-rush-auth",
      partialize: (state) => ({
        user: state.user,
        expiresAt: state.expiresAt
      })
    }
  )
);
