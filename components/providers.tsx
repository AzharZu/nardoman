"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { PremiumShell } from "@/components/premium-shell";

export function Providers({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void hydrate().then((dispose) => {
      cleanup = dispose;
    });
    return () => {
      cleanup?.();
    };
  }, [hydrate]);

  return (
    <>
      <PremiumShell />
      <div className="relative z-10">{children}</div>
    </>
  );
}
