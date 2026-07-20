import type { Handler } from "@netlify/functions";
import { env, userIdFromToken, signState, redirect, backToApp } from "./_lib";

/**
 * Starts the Meta (Facebook + Instagram) OAuth flow.
 * GET /api/oauth-meta?token=<supabase access token>
 */
export const handler: Handler = async (event) => {
  const token = event.queryStringParameters?.token;
  const userId = await userIdFromToken(token);
  if (!userId) return backToApp("error", "not_signed_in");
  if (!env.META_APP_ID) return backToApp("error", "meta_not_configured");

  const redirectUri = `${env.SITE_URL}/api/oauth-meta-callback`;
  const scope = [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "read_insights",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
  ].join(",");

  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", signState({ uid: userId, provider: "meta" }));
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");

  return redirect(url.toString());
};
