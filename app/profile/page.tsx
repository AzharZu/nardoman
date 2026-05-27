"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Container, Panel } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import { useProfileStore } from "@/store/profile-store";
import { hasSupabaseConfig, getSupabaseSetupMessage } from "@/lib/supabase/config";
import { getVibeRoomConfig } from "@/lib/vibe-rooms";

const vibeOptions = [
  { value: "grass-picnic", label: "Grass Picnic" },
  { value: "sunset-rooftop", label: "Sunset Rooftop" },
  { value: "zen-garden", label: "Zen Garden" },
  { value: "neon-city", label: "Neon City" }
];

const playstyleOptions = [
  { value: "Tactical", label: "Tactical" },
  { value: "Chill", label: "Chill" },
  { value: "Aggressive", label: "Aggressive" },
  { value: "Balanced", label: "Balanced" }
];

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const { profile, loading, error, loadProfile, updateProfile } = useProfileStore();
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [playstyle, setPlaystyle] = useState("Tactical");
  const [favoriteVibe, setFavoriteVibe] = useState<string>("");

  useEffect(() => {
    if (user) {
      void loadProfile(user.id, user.email, true);
    }
  }, [loadProfile, user]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setCity(profile.city ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setPlaystyle(profile.playstyle ?? "Tactical");
      setFavoriteVibe(profile.favorite_vibe_room ?? "");
    }
  }, [profile]);

  if (!hydrated) {
    return (
      <div className="page-shell py-10">
        <Container className="space-y-6">
          <Panel className="space-y-3">
            <p className="text-sm text-[#6f7480]">Checking your session...</p>
          </Panel>
        </Container>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell py-10">
        <Container className="space-y-6">
          <Panel className="space-y-4 border-[#d9ccb8] bg-[#fffaf3]">
            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Profile</p>
            <h1 className="text-3xl font-semibold text-[#1f2639]">Guest profile</h1>
            <p className="text-sm leading-6 text-[#6f7480]">
              Sign in to unlock editable profile fields, stats persistence, and Supabase-backed sync.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/login" className="rounded-2xl bg-[#6dae58] px-5 py-2.5 text-sm font-semibold text-white">
                Log in
              </Link>
              <Link href="/auth/signup" className="rounded-2xl border border-[#cfd7bf] bg-[#edf5e1] px-5 py-2.5 text-sm font-semibold text-[#5d8f49]">
                Create account
              </Link>
            </div>
            <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#6e6a5d]">Signed out view shows public data</Badge>
          </Panel>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <Container className="space-y-6">
        {!hasSupabaseConfig() ? (
          <div className="rounded-[24px] border border-[#e2d0a5] bg-[#fbf0d8] px-5 py-4 text-sm text-[#8d6a2b]">
            {getSupabaseSetupMessage("profile syncing")}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel className="space-y-5 border-[#d9ccb8] bg-[#fffaf3] p-6 shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Profile</p>
                <h1 className="text-3xl font-semibold text-[#1f2639]">Account details</h1>
                <p className="mt-1 text-sm text-[#6f7480]">Edit your identity and keep your stats in sync.</p>
              </div>
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#6e6a5d]">
                {profile ? "Synced profile" : "Creating profile"}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Row label="Email" value={user.email} />
              <Row label="Rating" value={String(profile?.rating ?? 1200)} />
              <Row label="Wins" value={String(profile?.wins ?? 0)} />
              <Row label="Losses" value={String(profile?.losses ?? 0)} />
              <Row label="Playstyle" value={profile?.playstyle ?? "Tactical"} />
            </div>

            <div className="flex items-center gap-4 rounded-[1.35rem] border border-[#d8ccb8] bg-[#f6f1e5] px-4 py-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#d8ccb8] bg-[#fffef9] text-xl font-semibold text-[#5d8f49]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (profile?.username ?? user.displayName).slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Avatar</p>
                <p className="text-sm text-[#6f7480]">Paste a direct image URL to personalize your profile.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Username</span>
                <input
                  className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-2.5 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] focus:border-[#8bbd5f]"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">City</span>
                <input
                  className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-2.5 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] focus:border-[#8bbd5f]"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </label>
            </div>

            <label className="space-y-1 text-sm">
              <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Avatar URL</span>
              <input
                className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-2.5 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] focus:border-[#8bbd5f]"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Playstyle</span>
              <select
                className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-2.5 text-sm text-[#1f2639] outline-none focus:border-[#8bbd5f]"
                value={playstyle}
                onChange={(event) => setPlaystyle(event.target.value)}
              >
                {playstyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Preferred vibe room</span>
              <select
                className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-2.5 text-sm text-[#1f2639] outline-none focus:border-[#8bbd5f]"
                value={favoriteVibe}
                onChange={(event) => setFavoriteVibe(event.target.value)}
              >
                <option value="">No favorite yet</option>
                {vibeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-[#6f7480]">
                This selection becomes your default room and coach vibe in the game.
              </p>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={loading}
                onClick={() => {
                  if (!user) return;
                  void updateProfile(user.id, user.email, {
                    username: username || user.displayName,
                    city: city || user.city,
                    avatar_url: avatarUrl || null,
                    playstyle: playstyle || "Tactical",
                    favorite_vibe_room: favoriteVibe || null
                  });
                }}
              >
                {loading ? "Saving..." : "Save changes"}
              </Button>
              <Badge className="border-[#d8ccb8] bg-[#f6f1e5] text-[#6e6a5d]">Profile sync is live when backend data is available</Badge>
            </div>

            {error ? <p className="text-sm text-[#c46e4f]">{error}</p> : null}
          </Panel>

          <Panel className="space-y-4 border-[#d9ccb8] bg-[#fffaf3] p-6 shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Stats</p>
              <h2 className="text-2xl font-semibold text-[#1f2639]">Player summary</h2>
            </div>
            <div className="grid gap-3">
              <Stat label="Level" value={profile?.level ?? 1} />
              <Stat label="Rating" value={profile?.rating ?? 1200} />
              <Stat label="Wins" value={profile?.wins ?? 0} />
              <Stat label="Losses" value={profile?.losses ?? 0} />
              <Stat label="Favorite room" value={toVibeLabel(profile?.favorite_vibe_room ?? "grass-picnic")} />
            </div>
            <div className="rounded-2xl border border-[#d8ccb8] bg-[#f6f1e5] px-4 py-3 text-sm text-[#6f7480]">
              Joined on {new Date(profile?.created_at ?? user.createdAt).toLocaleDateString()}
            </div>
          </Panel>
        </div>
      </Container>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1.35rem] border border-[#d8ccb8] bg-[#f6f1e5] px-4 py-3 text-sm">
      <span className="text-[#6e6a5d]">{label}</span>
      <span className="text-[#1f2639]">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1.35rem] border border-[#d8ccb8] bg-[#f6f1e5] px-4 py-3">
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[#6e6a5d]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#1f2639]">{value}</p>
    </div>
  );
}

function toVibeLabel(value: string) {
  return getVibeRoomConfig(value).label ?? vibeOptions.find((option) => option.value === value)?.label ?? value;
}
