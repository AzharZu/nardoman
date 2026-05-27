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
        <LinkButton href="/auth/login" variant="secondary" className="hidden whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm sm:inline-flex">
          Log in
        </LinkButton>
        <LinkButton href="/auth/signup" className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm">
          Sign up
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-[#d8ccb8] bg-[#fffaf3] px-2.5 py-1.5 shadow-[0_10px_28px_rgba(80,67,35,0.08)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf5e1] text-[#5d8f49]">
        <UserRound className="h-3.5 w-3.5" />
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
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#cfd7bf] bg-[#edf5e1] px-3.5 py-1.5 text-sm font-medium text-[#5d8f49] transition duration-300 hover:border-[#b8c7a0] hover:bg-[#e1ebd2]"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
