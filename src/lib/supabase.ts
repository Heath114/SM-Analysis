import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the app has been configured with a Supabase project. */
export const isConfigured = Boolean(url && anon && !url.includes("YOUR-PROJECT"));

if (!isConfigured) {
  // Loud, actionable warning rather than a silent white screen.
  console.warn(
    "[PulseBoard] Supabase is not configured. Set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_ANON_KEY in your environment (see .env.example)."
  );
}

export const supabase = createClient(url || "http://localhost", anon || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
