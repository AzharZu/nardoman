import { createClient } from "@supabase/supabase-js";

let hasWarned = false;

function getSupabaseBrowserKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const browserKey = getSupabaseBrowserKey();
  if (!url || !browserKey) {
    if (!hasWarned && typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[Backgammon Rush] Supabase env keys missing. Auth and data will use local mock mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable live backend."
      );
      hasWarned = true;
    }
    return null;
  }
  return createClient(url, browserKey);
}
