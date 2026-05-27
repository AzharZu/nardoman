import { Panel, Badge, LinkButton } from "@/components/ui";

export function UpgradeCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="space-y-4">
        <Badge className="border-white/10 bg-white/8">Free</Badge>
        <h3 className="text-xl font-semibold text-white">Core play</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li>Quick 5-minute matches</li>
          <li>Basic coaching</li>
          <li>Global leaderboard access</li>
        </ul>
        <LinkButton href="/dashboard" variant="secondary" className="w-full">
          Current plan
        </LinkButton>
      </Panel>
      <Panel className="space-y-4 border-accent-blue/30 bg-[linear-gradient(135deg,rgba(77,162,255,0.12),rgba(124,92,255,0.08))]">
        <Badge className="border-white/10 bg-white/8 text-accent-gold">Pro</Badge>
        <h3 className="text-xl font-semibold text-white">Advanced coaching</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li>Move explanations</li>
          <li>Premium themes</li>
          <li>Expanded statistics</li>
        </ul>
        <LinkButton href="/auth/signup" className="w-full">
          Upgrade for $9/mo
        </LinkButton>
      </Panel>
      <Panel className="space-y-4">
        <Badge className="border-white/10 bg-white/8">Tournaments</Badge>
        <h3 className="text-xl font-semibold text-white">Competitive pack</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li>Tournament brackets</li>
          <li>Priority matchmaking</li>
          <li>Seasonal rewards</li>
        </ul>
        <LinkButton href="/auth/signup" variant="secondary" className="w-full">
          Join waitlist
        </LinkButton>
      </Panel>
    </div>
  );
}
