import type { Handler } from "@netlify/functions";
import { schedule } from "@netlify/functions";
import { admin } from "./_lib";
import { syncAccount, type AccountRow } from "./_sync";

/**
 * Scheduled daily sync for ALL users' connected accounts.
 * Netlify runs this on the cron below; no HTTP auth needed (internal).
 */
const run: Handler = async () => {
  const db = admin();
  const { data: accounts, error } = await db
    .from("social_accounts")
    .select("id,platform,external_id,username")
    .eq("status", "connected");
  if (error) return { statusCode: 500, body: error.message };

  let ok = 0;
  for (const acc of (accounts ?? []) as AccountRow[]) {
    try {
      await syncAccount(db, acc);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (/token|expired|oauth|session/i.test(msg)) {
        await db.from("social_accounts").update({ status: "expired" }).eq("id", acc.id);
      }
    }
  }
  return { statusCode: 200, body: `Daily sync complete: ${ok}/${accounts?.length ?? 0}` };
};

// Runs every day at 06:00 UTC.
export const handler = schedule("0 6 * * *", run);
