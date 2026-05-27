import { Badge, Panel } from "@/components/ui";
import type { LeaderboardEntry } from "@/lib/types";

export function LeaderboardTable({ rows }: { rows: LeaderboardEntry[] }) {
  return (
    <Panel className="overflow-hidden">
      <div className="grid grid-cols-[64px_1.4fr_0.9fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/10 px-4 py-3 text-[0.65rem] uppercase tracking-[0.24em] text-muted">
        <span>Rank</span>
        <span>Player</span>
        <span>City</span>
        <span>Rating</span>
        <span>Wins</span>
        <span>Streak</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <div key={row.userId} className="grid grid-cols-[64px_1.4fr_0.9fr_0.7fr_0.7fr_0.7fr] gap-3 px-4 py-4 text-sm transition hover:bg-white/4">
            <div className="flex items-center">
              <Badge className="border-white/10 bg-white/8">#{row.rank}</Badge>
            </div>
            <div className="font-medium text-white">{row.displayName}</div>
            <div className="text-muted">{row.city}</div>
            <div className="text-white">{row.rating}</div>
            <div className="text-white">{row.wins}</div>
            <div className="text-success">{row.streak}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
