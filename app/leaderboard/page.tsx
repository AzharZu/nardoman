import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, MapPin, Medal, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { getLeaderboardEntries } from "@/lib/data/queries";

const cityTabs = ["Almaty", "Astana", "Bishkek"] as const;

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams?: Promise<{ city?: string }>;
}) {
  const rows = await getLeaderboardEntries();
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const params = (await searchParams) ?? {};
  const selectedCity = params.city?.toLowerCase() ?? "all";
  const filtered = selectedCity === "all" ? sorted : sorted.filter((row) => row.city.toLowerCase() === selectedCity);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Container className="flex h-[70px] items-center justify-between !max-w-[1180px] !px-5 sm:!px-6 lg:!px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold text-[#2a3041]">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <h1 className="text-3xl font-semibold text-[#1f2639]">Leaderboard</h1>
          </div>
          <Link href="/game" className="whitespace-nowrap rounded-2xl bg-[#6dae58] px-4 py-1.5 text-sm font-semibold text-white">
            Play Now
          </Link>
        </Container>
      </header>

      <Container className="py-6 lg:py-8 !max-w-[1140px] !px-5 sm:!px-6 lg:!px-8">
        <section className="hero-green rounded-[30px] py-9 text-center text-white">
          <Trophy className="mx-auto h-12 w-12" />
          <h2 className="mt-3 text-4xl font-semibold md:text-5xl">Top Players Near You</h2>
          <p className="mt-2 text-lg text-white/90 md:text-xl">Join the local community of backgammon enthusiasts</p>
        </section>

        <section className="soft-panel mt-6 p-4 sm:p-5">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-[24px] bg-[#e8e4dc] p-2 text-center text-sm font-semibold text-[#2a3041] sm:grid-cols-4 sm:text-base">
            <Tab href="/leaderboard" active={selectedCity === "all"}>
              All
            </Tab>
            {cityTabs.map((city) => (
              <Tab key={city} href={`/leaderboard?city=${encodeURIComponent(city)}`} active={selectedCity === city.toLowerCase()}>
                {city}
              </Tab>
            ))}
          </div>

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d8ccb8] bg-[#fffaf3] px-5 py-8 text-center text-[#6f7480]">
                No players in this city yet. Switch tabs or play more matches.
              </div>
            ) : null}
            {filtered.map((row, index) => (
              <article
                key={row.userId}
                className={`grid items-center gap-3 rounded-[24px] px-4 py-4 ${
                  index < 3 ? "border border-[#efd39b] bg-[#f8f5ec]" : "border border-transparent bg-transparent"
                } md:grid-cols-[1.2fr_0.45fr_0.45fr_0.35fr]`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center text-[#e1b34f]">
                    {index === 0 ? <Trophy className="h-7 w-7" /> : index === 1 ? <Medal className="h-7 w-7 text-[#a7c58d]" /> : index === 2 ? <Medal className="h-7 w-7 text-[#f4a881]" /> : <span className="text-2xl font-semibold text-[#707786]">{row.rank}</span>}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#202738] md:text-[2rem]">{row.displayName}</p>
                    <p className="flex items-center gap-1 text-lg text-[#707786] md:text-xl">
                      <MapPin className="h-3.5 w-3.5" />
                      {row.city}
                    </p>
                  </div>
                </div>
                <Stat value={row.wins.toString()} label="Wins" tone="text-[#67a859]" />
                <Stat value={`${Math.round((row.rating / 2400) * 100)}%`} label="Win Rate" tone="text-[#7abbe6]" />
                <Stat value={row.streak.toString()} label="Streak" tone="text-[#f1a076]" />
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7 flex items-center justify-between rounded-[24px] border border-[#afcda6] bg-[linear-gradient(90deg,#eaf4e5,#f3f5ec,#e4edd6)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6dae58] text-xl font-semibold text-white">#247</div>
            <div>
              <p className="text-2xl font-semibold text-[#21293a] md:text-3xl">Your Rank</p>
              <p className="text-lg text-[#667080] md:text-xl">Keep playing to climb higher!</p>
            </div>
          </div>
          <Link href="/game" className="rounded-2xl bg-[#6dae58] px-6 py-2.5 text-base font-semibold text-white">
            Play to Improve
          </Link>
        </section>
      </Container>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="text-right md:text-center">
      <p className={`text-2xl font-semibold md:text-3xl ${tone}`}>{value}</p>
      <p className="text-lg text-[#707786] md:text-xl">{label}</p>
    </div>
  );
}

function Tab({
  href,
  children,
  active
}: {
  href: Route;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-2 transition ${
        active ? "bg-[#f5f6f8] text-[#1f2639] shadow-sm" : "text-[#6f7480] hover:bg-[#f5f1e7] hover:text-[#1f2639]"
      }`}
    >
      {children}
    </Link>
  );
}
