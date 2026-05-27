export type VibeRoomKey = "grass-picnic" | "sunset-rooftop" | "zen-garden" | "neon-city";

export interface VibeRoomConfig {
  key: VibeRoomKey;
  label: string;
  description: string;
  backgroundImage: string;
  accent: string;
  badge: string;
  coachStyle: "warm" | "calm" | "electric";
  proOnly: boolean;
}

const VIBE_ROOMS: Record<VibeRoomKey, VibeRoomConfig> = {
  "grass-picnic": {
    key: "grass-picnic",
    label: "Grass Picnic",
    description: "Warm, cozy daytime matches with a soft lifestyle feel.",
    backgroundImage: "/background-nard.png",
    accent: "text-[#6ca86b]",
    badge: "Warm default",
    coachStyle: "warm",
    proOnly: false
  },
  "sunset-rooftop": {
    key: "sunset-rooftop",
    label: "Sunset Rooftop",
    description: "Golden hour games with a relaxed skyline mood.",
    backgroundImage: "/background-nard.png",
    accent: "text-[#d7a15b]",
    badge: "Guest friendly",
    coachStyle: "warm",
    proOnly: false
  },
  "zen-garden": {
    key: "zen-garden",
    label: "Zen Garden",
    description: "Calm strategy space with your provided Zen Garden board art.",
    backgroundImage: "/pro/zen-garden-pro.png",
    accent: "text-[#5d8f49]",
    badge: "Pro room",
    coachStyle: "calm",
    proOnly: true
  },
  "neon-city": {
    key: "neon-city",
    label: "Neon City",
    description: "Sharper, high-contrast late-night energy with neon-lit focus.",
    backgroundImage: "/pro/neon-city-pro.png",
    accent: "text-[#f46bd8]",
    badge: "Pro room",
    coachStyle: "electric",
    proOnly: true
  }
};

export function getVibeRoomConfig(room?: string | null): VibeRoomConfig {
  const key = isVibeRoomKey(room) ? room : "grass-picnic";
  return VIBE_ROOMS[key];
}

export function isProVibeRoom(room?: string | null) {
  return getVibeRoomConfig(room).proOnly;
}

export function isVibeRoomKey(room?: string | null): room is VibeRoomKey {
  return room === "grass-picnic" || room === "sunset-rooftop" || room === "zen-garden" || room === "neon-city";
}

export function getCoachFlavor(room?: string | null) {
  const config = getVibeRoomConfig(room);
  if (config.coachStyle === "calm") {
    return {
      prefix: "Zen Coach",
      intro: "Slow the pace, protect the structure, and let the board breathe.",
      suffix:
        "The room is tuned for patient decisions, so you should favor safe structure and quiet pressure."
    };
  }
  if (config.coachStyle === "electric") {
    return {
      prefix: "Neon Coach",
      intro: "Turn up the tempo and look for sharp tactical pressure.",
      suffix:
        "This room rewards bold, active play, but keep the risk visible so the board does not collapse."
    };
  }
  return {
    prefix: "Coach",
    intro: "Keep the board cozy, stable, and easy to read.",
    suffix:
      "This room stays warm and friendly, so favor clean structure and steady tempo over fancy risks."
  };
}

export function preloadVibeRoomBackgrounds(rooms: Array<VibeRoomKey | VibeRoomConfig>) {
  if (typeof window === "undefined") return;

  const seen = new Set<string>();
  for (const room of rooms) {
    const config = typeof room === "string" ? getVibeRoomConfig(room) : room;
    if (seen.has(config.backgroundImage)) continue;
    seen.add(config.backgroundImage);

    const image = new window.Image();
    image.src = config.backgroundImage;
  }
}
