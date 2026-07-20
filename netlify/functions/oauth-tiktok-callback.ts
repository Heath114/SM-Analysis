import type { Handler } from "@netlify/functions";
import { env, verifyState, admin, saveAccount, backToApp } from "./_lib";

/** TikTok OAuth redirect target — exchanges the code and stores the creator account. */
export const handler: Handler = async (event) => {
  const q = event.queryStringParameters ?? {};
  if (q.error) return backToApp("error", q.error_description || q.error);

  const state = verifyState(q.state);
  if (!state) return backToApp("error", "bad_state");
  const code = q.code;
  if (!code) return backToApp("error", "missing_code");

  try {
    const redirectUri = `${env.SITE_URL}/api/oauth-tiktok-callback`;

    // 1. exchange code for tokens
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY,
        client_secret: env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const tok = await tokenRes.json();
    if (!tok.access_token) return backToApp("error", tok.error_description || tok.error || "token_exchange_failed");

    const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null;

    // 2. fetch profile
    const infoRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url,username,follower_count",
      { headers: { Authorization: `Bearer ${tok.access_token}` } }
    );
    const info = await infoRes.json();
    const u = info.data?.user ?? {};

    await saveAccount(admin(), state.uid,
      {
        platform: "tiktok",
        external_id: tok.open_id || u.open_id || "tiktok_user",
        username: u.username || u.display_name || "tiktok",
        display_name: u.display_name ?? null,
        avatar_url: u.avatar_url ?? null,
      },
      { access_token: tok.access_token, refresh_token: tok.refresh_token ?? null, expires_at: expiresAt, extra: { scope: tok.scope } });

    return backToApp("connected", "tiktok");
  } catch (e) {
    return backToApp("error", e instanceof Error ? e.message : "tiktok_callback_failed");
  }
};
