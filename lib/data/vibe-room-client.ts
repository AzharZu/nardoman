import type { VibeRoomKey } from "@/lib/vibe-rooms";
import { isVibeRoomKey } from "@/lib/vibe-rooms";

const STORAGE_KEY = "backgammon-rush-selected-vibe-room";

export function getStoredVibeRoom(): VibeRoomKey | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isVibeRoomKey(raw) ? raw : null;
}

export function setStoredVibeRoom(room: VibeRoomKey) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, room);
}

export function clearStoredVibeRoom() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
