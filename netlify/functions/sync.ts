import type { Handler } from "@netlify/functions";
import { admin, userIdFromToken, json } from "./_lib";
import { syncAccount, type AccountRow } from "./_sync";

/**
 * POST /api/sync   (Authorization: Bearer <supabase token>)
 * Pulls the latest metrics + content for every connected account of the user.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { message: "Use POST." });
  const uid = await userIdFromToken(event.headers.authorization);
  if (!uid) return json(401, { message: "Not signed in." });

  const db = admin();
  const { data: accounts, error } = await db
    .from("social_accounts")
    .select("id,platform,external_id,username")
    .eq("user_id", uid)
    .eq("status", "connected");
  if (error) return json(500, { message: error.message });
  if (!accounts?.length) return json(200, { message: "No connected accounts to sync." });

  let ok = 0;
  const failures: string[] = [];
  for (const acc of accounts as AccountRow[]) {
    try {
      await syncAccount(db, acc);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      failures.push(`${acc.platform}:${acc.username}`);
      if (/token|expired|oauth|session/i.test(msg)) {
        await db.from("social_accounts").update({ status: "expired" }).eq("id", acc.id);
      }
    }
  }

  const message = failures.length
    ? `Synced ${ok}/${accounts.length}. Reconnect needed: ${failures.join(", ")}`
    : `Synced ${ok} account${ok === 1 ? "" : "s"}.`;
  return json(200, { message, ok, total: accounts.length });
};
