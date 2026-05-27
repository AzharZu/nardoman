export default function Loading() {
  return (
    <div className="relative mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="premium-surface relative w-full overflow-hidden rounded-[2rem] p-8 sm:p-10">
        <div className="absolute inset-0 animate-shimmerMove bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.08)_40%,transparent_55%)]" />
        <div className="relative space-y-6">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="h-12 w-[min(36rem,80%)] rounded-2xl bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-36 rounded-[1.5rem] border border-white/10 bg-white/6" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="h-80 rounded-[1.75rem] border border-white/10 bg-white/6" />
            <div className="space-y-4">
              <div className="h-28 rounded-[1.5rem] border border-white/10 bg-white/6" />
              <div className="h-28 rounded-[1.5rem] border border-white/10 bg-white/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
