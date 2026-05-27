"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function PremiumShell() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setCursor({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <motion.div
        className="cursor-glow"
        animate={{ x: cursor.x, y: cursor.y, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 22, mass: 0.4 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_45%)]" />
      <div className="premium-noise absolute inset-0 opacity-70" />
      <div className="absolute inset-0">
        <div className={cn("absolute left-[8%] top-[12%] h-40 w-40 rounded-full bg-accent-blue/10 blur-3xl animate-floatSlow")} />
        <div className={cn("absolute right-[10%] top-[18%] h-56 w-56 rounded-full bg-accent-purple/10 blur-3xl animate-floatSlow")} />
        <div className={cn("absolute bottom-[10%] left-[45%] h-72 w-72 rounded-full bg-accent-gold/8 blur-3xl animate-floatSlow")} />
      </div>
    </div>
  );
}
