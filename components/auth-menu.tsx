"use client";

import { useAuthStore } from "@/store/auth-store";
import { Badge, LinkButton } from "@/components/ui";
import { LogOut, UserRound } from "lucide-react";

export function AuthMenu() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton href="/auth/login" variant="secondary" className="hidden sm:inline-flex rounded-full px-4 py-2">
          Log in
        </LinkButton>
        <LinkButton href="/auth/signup" className="rounded-full px-4 py-2">
          Sign up
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-[#d8ccb8] bg-[#fffaf3] px-3 py-2 shadow-[0_10px_28px_rgba(80,67,35,0.08)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf5e1] text-[#5d8f49]">
        <UserRound className="h-4 w-4" />
      </div>
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#1f2639]">{user.displayName}</span>
          {user.pro ? <Badge className="border-[#a7c994] bg-[#edf6e5] text-[#5d8f49]">Pro</Badge> : null}
        </div>
        <span className="text-[11px] text-[#6f7480]">{user.email}</span>
      </div>
      <button
        onClick={() => signOut()}
        className="inline-flex items-center gap-2 rounded-full border border-[#cfd7bf] bg-[#edf5e1] px-4 py-2 text-sm font-medium text-[#5d8f49] transition duration-300 hover:border-[#b8c7a0] hover:bg-[#e1ebd2]"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
