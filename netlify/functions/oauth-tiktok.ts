import type { Handler } from "@netlify/functions";
import { env, userIdFromToken, signState, redirect, backToApp } from "./_lib";

/**
 * Starts the TikTok Login Kit (v2) OAuth flow.
 * GET /api/oauth-tiktok?token=<supabase access token>
 */
export const handler: Handler = async (event) => {
  const token = event.queryStringParameters?.token;
  const userId = await userIdFromToken(token);
  if (!userId) return backToApp("error", "not_signed_in");
  if (!env.TIKTOK_CLIENT_KEY) return backToApp("error", "tiktok_not_configured");

  const redirectUri = `${env.SITE_URL}/api/oauth-tiktok-callback`;
  const scope = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"].join(",");

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", env.TIKTOK_CLIENT_KEY);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", signState({ uid: userId, provider: "tiktok" }));

  return redirect(url.toString());
};
