"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Panel } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";

export function LoginForm() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState("player@rush.gg");
  const [password, setPassword] = useState("password123");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      const message =
        (err as Error)?.message ||
        "Could not sign in. Check your credentials or backend configuration.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel className="mx-auto max-w-md space-y-5 border-[#d9ccb8] bg-[#fffaf3] text-[#1f2639] shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
      <div className="space-y-2">
        <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Login</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2639]">Return to the board</h1>
        <p className="text-sm leading-6 text-[#6f7480]">Sign in to access your match history, ranking, and premium coaching layer.</p>
      </div>
      {!supabaseConfigured ? (
        <Badge className="border-[#e2d0a5] bg-[#fbf0d8] text-[0.7rem] uppercase tracking-[0.22em] text-[#8d6a2b]">
          Backend connection missing - sign in is unavailable.
        </Badge>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Email</span>
          <input
            className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-3 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] transition focus:border-[#8bbd5f]"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Password</span>
          <input
            className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-3 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] transition focus:border-[#8bbd5f]"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
        {error ? <p className="text-xs text-[#c46e4f]">{error}</p> : null}
      </form>
    </Panel>
  );
}

export function SignupForm() {
  const router = useRouter();
  const signUp = useAuthStore((state) => state.signUp);
  const [displayName, setDisplayName] = useState("Player One");
  const [email, setEmail] = useState("player@rush.gg");
  const [password, setPassword] = useState("password123");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signUp(email, password, displayName);
      router.push("/dashboard");
    } catch (err) {
      const message =
        (err as Error)?.message ||
        "Could not create account. Check your details or backend configuration.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel className="mx-auto max-w-md space-y-5 border-[#d9ccb8] bg-[#fffaf3] text-[#1f2639] shadow-[0_18px_55px_rgba(80,67,35,0.08)]">
      <div className="space-y-2">
        <p className="text-[0.7rem] uppercase tracking-[0.28em] text-[#6ca86b]">Signup</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2639]">Create your account</h1>
        <p className="text-sm leading-6 text-[#6f7480]">Set up your profile on the live backend and join the ladder.</p>
      </div>
      {!supabaseConfigured ? (
        <Badge className="border-[#e2d0a5] bg-[#fbf0d8] text-[0.7rem] uppercase tracking-[0.22em] text-[#8d6a2b]">
          Backend connection missing - sign up is unavailable.
        </Badge>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Display name</span>
          <input
            className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-3 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] transition focus:border-[#8bbd5f]"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Email</span>
          <input
            className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-3 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] transition focus:border-[#8bbd5f]"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.18em] text-[#6e6a5d]">Password</span>
          <input
            className="w-full rounded-2xl border border-[#d8ccb8] bg-[#fffef9] px-4 py-3 text-sm text-[#1f2639] outline-none placeholder:text-[#a0a79b] transition focus:border-[#8bbd5f]"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
        {error ? <p className="text-xs text-[#c46e4f]">{error}</p> : null}
      </form>
    </Panel>
  );
}
