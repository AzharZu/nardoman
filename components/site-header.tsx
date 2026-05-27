import Link from "next/link";
import { Container, NavLink } from "@/components/ui";
import { AuthMenu } from "@/components/auth-menu";

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50 relative border-b border-white/8 bg-[#080c15]/72 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(77,162,255,0.8),rgba(124,92,255,0.8),transparent)]" />
      <Container className="flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-white/12 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-1 rounded-[0.9rem] bg-[linear-gradient(135deg,rgba(77,162,255,0.9),rgba(124,92,255,0.9))]" />
            <span className="relative text-[0.7rem] font-black tracking-[0.18em] text-white">BR</span>
          </div>
          <div>
            <p className="text-[0.9rem] font-semibold tracking-tight text-white">Backgammon Rush</p>
            <p className="text-[0.72rem] text-muted">Cinematic strategy platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href="/game" prefetch>
            Game
          </NavLink>
          <NavLink href="/dashboard" prefetch>
            Dashboard
          </NavLink>
          <NavLink href="/leaderboard" prefetch>
            Leaderboard
          </NavLink>
          <NavLink href="/pro" prefetch>
            Pro
          </NavLink>
          <NavLink href="/profile" prefetch>
            Profile
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/6 px-2.5 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] text-muted md:flex">
            Live
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_18px_rgba(25,195,125,0.9)]" />
          </div>
          <AuthMenu />
        </div>
      </Container>
    </header>
  );
}
