"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Brain, Crown, Palette, Sparkles, Users, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthMenu } from "@/components/auth-menu";
import { Badge, Button, Container, LinkButton, Panel } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";
import { useProfileStore } from "@/store/profile-store";
import { getStoredVibeRoom, setStoredVibeRoom } from "@/lib/data/vibe-room-client";
import {
  formatSubscriptionDeadline,
  formatTrialRemaining,
  getEffectiveSubscriptionSnapshot,
  startTrialClient
} from "@/lib/data/subscription-client";
import { hasSupabaseConfig, getSupabaseSetupMessage } from "@/lib/supabase/config";
import { getVibeRoomConfig, isProVibeRoom, isVibeRoomKey, preloadVibeRoomBackgrounds, type VibeRoomKey } from "@/lib/vibe-rooms";

const perks = [
  {
    icon: Palette,
    title: "Custom Board Skins",
    text: "Unlock exclusive board designs and checker styles",
    tone: "text-[#e1b349] bg-[#f8f4e8]"
  },
  {
    icon: Sparkles,
    title: "Seasonal Themes",
    text: "Spring garden, winter cabin, autumn forest vibes",
    tone: "text-[#f5a272] bg-[#f9f1eb]"
  },
  {
    icon: Brain,
    title: "Coach+",
    text: "Advanced analysis, opening theory, endgame mastery",
    tone: "text-[#80bee8] bg-[#edf6fd]"
  },
  {
    icon: Users,
    title: "Family Tournament Mode",
    text: "Host private tournaments with friends and family",
    tone: "text-[#73b263] bg-[#eef6ea]"
  },
  {
    icon: Volume2,
    title: "Premium Soundscapes",
    text: "Curated ambient sounds for each vibe room",
    tone: "text-[#9cc06f] bg-[#f4f8ed]"
  },
  {
    icon: Crown,
    title: "Priority Support",
    text: "Get help faster with dedicated support",
    tone: "text-[#dfb349] bg-[#f8f4e8]"
  }
];

const ROOM_OPTIONS = [getVibeRoomConfig("zen-garden"), getVibeRoomConfig("neon-city")] as const;

export default function ProPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { profile, loadProfile, updateProfile } = useProfileStore();
  const setUser = useAuthStore((state) => state.setUser);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeRoomKey, setActiveRoomKey] = useState<VibeRoomKey>("grass-picnic");

  useEffect(() => {
    if (user) {
      void loadProfile(user.id, user.email, true);
    }
  }, [loadProfile, user]);

  useEffect(() => {
    preloadVibeRoomBackgrounds(["grass-picnic", "zen-garden", "neon-city"]);
  }, []);

  const subscription = useMemo(() => getEffectiveSubscriptionSnapshot(profile, user), [profile, user]);

  useEffect(() => {
    const storedRoom = getStoredVibeRoom();
    if (storedRoom) {
      setActiveRoomKey(storedRoom);
      return;
    }

    if (subscription.isActive && profile?.favorite_vibe_room && isVibeRoomKey(profile.favorite_vibe_room)) {
      setActiveRoomKey(profile.favorite_vibe_room);
      return;
    }

    setActiveRoomKey("grass-picnic");
  }, [profile, subscription.isActive]);

  const currentVibeRoom = getVibeRoomConfig(activeRoomKey);
  const paymentDueAt = profile?.trial_ends_at ?? profile?.pro_until ?? null;
  const paymentDueLabel = formatSubscriptionDeadline(paymentDueAt, "No payment time set");

  useEffect(() => {
    void router.prefetch("/dashboard");
    void router.prefetch("/game/setup");
    void router.prefetch("/game");
  }, [router]);

  const handleStartTrial = async () => {
    if (!user) {
      router.push("/auth/signup?next=/pro");
      return;
    }

    setPending(true);
    setNotice(null);
    try {
      const updatedProfile = await startTrialClient(user.id, user.email);
      void loadProfile(user.id, user.email, true);
      setUser({
        ...user,
        displayName: updatedProfile.username,
        city: updatedProfile.city,
        avatarUrl: updatedProfile.avatar_url ?? null,
        pro: true,
        proUntil: updatedProfile.pro_until
      });
      setNotice("2-hour test period activated. Pro access is now live.");
    } catch (error) {
      setNotice((error as Error)?.message ?? "Could not start the trial.");
    } finally {
      setPending(false);
    }
  };

  const ctaLabel = !user
    ? "Create account to start trial"
    : subscription.isActive
      ? "Trial already active"
      : profile?.trial_started_at
        ? "Trial already used"
        : "Start 2h test period";

  const handleRoomSelect = async (roomKey: VibeRoomKey) => {
    if (!user) {
      router.push("/auth/signup?next=/pro");
      return;
    }
    if (isProVibeRoom(roomKey) && !subscription.isActive) {
      setNotice("Start the 2-hour trial to unlock Pro rooms.");
      return;
    }

    setNotice(null);
    setActiveRoomKey(roomKey);
    setStoredVibeRoom(roomKey);
    void updateProfile(user.id, user.email, { favorite_vibe_room: roomKey });
    setUser({ ...user, pro: subscription.isActive, proUntil: profile?.pro_until ?? user.proUntil });
    setNotice(`Saved ${getVibeRoomConfig(roomKey).label} as your active room.`);
  };

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Container className="flex h-[82px] items-center gap-8 justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" prefetch className="inline-flex items-center gap-2 text-xl font-semibold text-[#2a3041]">
              <ArrowLeft className="h-5 w-5" />
              Home
            </Link>
            <h1 className="flex items-center gap-2 text-4xl font-semibold text-[#1f2639]">
              <Crown className="h-7 w-7 text-[#dfb349]" />
              Backgammon Rush Pro
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <AuthMenu />
            <LinkButton href="/dashboard" variant="secondary">
              Dashboard
            </LinkButton>
          </div>
        </Container>
      </header>

      <section
        className="relative overflow-hidden py-16"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,243,236,0.84),rgba(245,243,236,0.84)),url('https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=1800&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <Container className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <div className="text-center lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#dfb349,#f5a272)] px-6 py-2 text-xl font-semibold text-white lg:mx-0">
              <Crown className="h-5 w-5" />
              Premium Lifestyle Upgrade
            </div>
            <h2 className="mt-5 text-5xl font-semibold leading-tight text-[#1f2639] md:text-7xl">
              Elevate Your
              <br />
              <span className="text-[#6dae58]">Backgammon Experience</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[900px] text-2xl text-[#636a78] md:text-4xl lg:mx-0">
              Not just a subscription. A complete atmosphere upgrade that makes every game feel special.
            </p>
            {!hasSupabaseConfig() ? (
              <div className="mt-6 rounded-[24px] border border-[#e2d0a5] bg-[#fbf0d8] px-5 py-4 text-left text-sm text-[#8d6a2b]">
                {getSupabaseSetupMessage("premium trial activation and account sync")}
              </div>
            ) : null}
          </div>

          <Panel className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6f7480]">Subscription</p>
                <h3 className="mt-1 text-2xl font-semibold text-[#1f2639]">2-hour test period</h3>
              </div>
              <Badge className={subscription.isActive ? "border-[#a7c994] bg-[#edf6e5] text-[#5d8f49]" : "border-[#e2d0a5] bg-[#fbf0d8] text-[#8d6a2b]"}>
                {subscription.isActive ? "Active" : profile?.trial_started_at ? "Used" : "Free"}
              </Badge>
            </div>

            <p className="text-sm leading-6 text-[#616978]">
              Activate a 2-hour Pro trial on a registered account only. The backend stores the start time once per account and will not let the same account restart it.
            </p>

            {subscription.isActive ? (
              <div className="rounded-[22px] border border-[#cfe1bc] bg-[#eef7e7] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#5d8f49]">Time remaining</p>
                <p className="mt-2 text-3xl font-semibold text-[#3f6a31]">{formatTrialRemaining(subscription.remainingMs)}</p>
                <p className="mt-1 text-sm text-[#5f7752]">Pro features stay unlocked until {paymentDueLabel}. Payment is due after that time.</p>
              </div>
            ) : profile?.trial_started_at ? (
              <div className="rounded-[22px] border border-[#e2d0a5] bg-[#fbf0d8] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8d6a2b]">Trial used</p>
                <p className="mt-2 text-lg font-semibold text-[#6f5620]">This account already used the 2-hour test period.</p>
                <p className="mt-1 text-sm text-[#8f7646]">Payment became due at {paymentDueLabel}. This account cannot start the trial again.</p>
              </div>
            ) : (
              <div className="rounded-[22px] border border-[#d8ccb8] bg-[#fffaf2] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#6f7480]">What happens next</p>
                <p className="mt-2 text-sm leading-6 text-[#616978]">
                  Sign up first, then start the one-time trial. We create a real subscription record, mark this registered account as on trial, and unlock premium rooms immediately.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button className="flex-1" onClick={handleStartTrial} disabled={pending || subscription.isActive || Boolean(profile?.trial_started_at)}>
                {pending ? "Starting trial..." : ctaLabel}
              </Button>
              <LinkButton href="/dashboard" variant="secondary" className="flex-1">
                Open dashboard
              </LinkButton>
            </div>

            {notice ? <p className="text-sm text-[#5d8f49]">{notice}</p> : null}
            {!user ? (
              <div className="flex gap-3">
                <LinkButton href="/auth/login" variant="secondary" className="flex-1">
                  Log in
                </LinkButton>
                <LinkButton href="/auth/signup" className="flex-1">
                  Sign up
                </LinkButton>
              </div>
            ) : null}
          </Panel>
        </Container>
      </section>

      <section className="bg-[#f6f6f7] py-12">
        <Container className="grid gap-5 lg:grid-cols-3">
          {perks.map((perk) => (
            <article key={perk.title} className="soft-panel p-7">
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${perk.tone}`}>
                <perk.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-4xl font-semibold text-[#21293a] md:text-3xl">{perk.title}</h3>
              <p className="mt-5 text-3xl leading-[1.3] text-[#616978] md:text-2xl">{perk.text}</p>
            </article>
          ))}
        </Container>
      </section>

      <section className="bg-[#f0eadd] py-14">
        <Container>
          <div className="text-center">
            <h3 className="text-5xl font-semibold text-[#1f2639] md:text-6xl">Exclusive Vibe Rooms</h3>
            <p className="mt-3 text-3xl text-[#6f7480] md:text-4xl">Pro members get access to premium atmospheres and a room-specific AI Coach tone</p>
          </div>
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            {ROOM_OPTIONS.map((room) => (
              <RoomCard
                key={room.key}
                room={room}
                active={currentVibeRoom.key === room.key}
                locked={!subscription.isActive}
                onSelect={() => handleRoomSelect(room.key)}
              />
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-[#6f7480]">Switching rooms updates the game background and the coach copy immediately.</p>
        </Container>
      </section>

      <section className="bg-[#f6f6f7] py-14">
        <Container>
          <div className="text-center">
            <h3 className="text-5xl font-semibold text-[#1f2639] md:text-6xl">Trial access</h3>
            <p className="mt-3 text-3xl text-[#6f7480] md:text-4xl">Free trial today, $9/mo later when billing is connected</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-[1040px] gap-5 lg:grid-cols-2">
            <AccessCard
              title="2-hour Trial"
              price="Free trial"
              subtitle="then $9/mo"
              details={["Instant Pro unlock", "Saved to Supabase", "Expires after 2 hours"]}
              active={subscription.isActive}
              buttonLabel={subscription.isActive ? "Trial active" : "Start free trial"}
              onClick={handleStartTrial}
              buttonTone="bg-[#1e2740]"
              disabled={pending || subscription.isActive || Boolean(profile?.trial_started_at)}
            />
            <AccessCard
              title="Future Paid Plan"
              price="$9/mo"
              subtitle="for later launch"
              details={["Keeps the same premium UX", "Swap trial for payment later", "No payment collected today"]}
              active={false}
              buttonLabel="Open dashboard"
              href="/dashboard"
              buttonTone="bg-[#6dae58]"
            />
          </div>
          <p className="mt-8 text-center text-3xl text-[#7a7f8a] md:text-[30px]">The current product path is a 2-hour test period, ready for real billing later.</p>
        </Container>
      </section>
    </div>
  );
}

function RoomCard({
  room,
  active,
  locked,
  onSelect
}: {
  room: ReturnType<typeof getVibeRoomConfig>;
  active: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[32px] border p-5 text-white shadow-[0_18px_55px_rgba(80,67,35,0.12)] ${
        active ? "border-[#6dae58]" : "border-transparent"
      }`}
      style={{
        backgroundImage: `linear-gradient(rgba(20,28,37,0.38),rgba(20,28,37,0.38)),url('${room.backgroundImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-block rounded-lg bg-[#dfb349] px-3 py-1 text-xl font-semibold">{room.badge}</span>
        {active ? <Badge className="border-white/20 bg-white/15 text-white">Active</Badge> : null}
      </div>
      <h4 className="mt-4 text-5xl font-semibold md:text-4xl">{room.label}</h4>
      <p className="mt-2 max-w-[28ch] text-3xl text-white/90 md:text-2xl">{room.description}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={onSelect}
          disabled={locked}
          className={`rounded-2xl px-5 py-3 text-sm font-semibold ${locked ? "bg-white/18 text-white/70" : "bg-white text-[#1f2639]"}`}
        >
          {locked ? "Start trial to unlock" : active ? "Selected" : "Use this room"}
        </Button>
        <span className="text-xs uppercase tracking-[0.22em] text-white/75">AI Coach adjusts automatically</span>
      </div>
    </article>
  );
}

function AccessCard({
  title,
  price,
  subtitle,
  details,
  buttonLabel,
  active,
  onClick,
  href,
  buttonTone = "bg-[#6dae58]",
  disabled = false
}: {
  title: string;
  price: string;
  subtitle: string;
  details: string[];
  buttonLabel: string;
  active: boolean;
  onClick?: () => void;
  href?: Route;
  buttonTone?: string;
  disabled?: boolean;
}) {
  return (
    <article className={`soft-panel relative p-8 ${active ? "border-[#67ad57]" : ""}`}>
      {active ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#6dae58] px-4 py-1 text-xl font-semibold text-white">
          Active
        </span>
      ) : null}
      <h4 className="text-center text-5xl font-semibold text-[#1f2639] md:text-4xl">{title}</h4>
      <p className="mt-3 text-center text-6xl font-semibold text-[#67a859] md:text-5xl">
        {price} <span className="text-3xl font-normal text-[#6f7480] md:text-2xl">{subtitle}</span>
      </p>
      <ul className="mt-7 space-y-3 text-4xl text-[#202738] md:text-[30px]">
        {details.map((detail) => (
          <li key={detail}>✓ {detail}</li>
        ))}
      </ul>
      {href ? (
        <Link
          href={href}
          className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl py-3 text-3xl font-semibold text-white md:text-2xl ${buttonTone}`}
        >
          {buttonLabel}
        </Link>
      ) : (
        <Button className={`mt-8 w-full py-3 text-3xl md:text-2xl ${buttonTone}`} onClick={onClick} disabled={disabled}>
          {buttonLabel}
        </Button>
      )}
    </article>
  );
}
