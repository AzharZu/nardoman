"use client";

import dynamic from "next/dynamic";

const GameSetupClient = dynamic(() => import("./setup-client"), {
  ssr: false
});

export default function GameSetupPage() {
  return <GameSetupClient />;
}
