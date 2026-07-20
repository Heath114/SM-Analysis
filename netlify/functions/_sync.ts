import type { SupabaseClient } from "@supabase/supabase-js";

const GRAPH = "https://graph.facebook.com/v19.0";
export const today = () => new Date().toISOString().slice(0, 10);

export interface AccountRow {
  id: string; platform: string; external_id: string; username: string;
}
interface DayMetric { followers: number; reach: number; impressions: number; views: number; engagements: number; }
interface Post {
  external_id: string; title: string; media_type: string; permalink: string | null;
  published_at: string; views: number; likes: number; comments: number; shares: number;
  saves: number; reach: number; avg_watch_seconds: number | null; retention_pct: number | null;
}
interface Audience {
  age: Record<string, number>;
  gender: Record<string, number>;
  countries: Record<string, number>;
  devices: Record<string, number>;
  active_hours: number[][]; // [7][24]
}

/** Sync one account: fetch from the platform API and upsert into Supabase.
 *  Throws on failure so the caller can flag the account. */
export async function syncAccount(db: SupabaseClient, acc: AccountRow): Promise<void> {
  const { data: secretRow } = await db.from("account_secrets").select("access_token,extra").eq("account_id", acc.id).single();
  const token = secretRow?.access_token as string | undefined;
  if (!token) throw new Error("missing token");

  let metric: DayMetric = { followers: 0, reach: 0, impressions: 0, views: 0, engagements: 0 };
  let posts: Post[] = [];
  if (acc.platform === "instagram") ({ metric, posts } = await syncInstagram(acc, token));
  else if (acc.platform === "facebook") ({ metric, posts } = await syncFacebook(acc, token));
  else if (acc.platform === "tiktok") ({ metric, posts } = await syncTiktok(acc, token));

  await db.from("metrics_daily").upsert(
    { account_id: acc.id, platform: acc.platform, date: today(), ...metric },
    { onConflict: "account_id,date" }
  );
  if (posts.length) {
    await db.from("content").upsert(
      posts.map((p) => ({ account_id: acc.id, platform: acc.platform, ...p })),
      { onConflict: "account_id,external_id" }
    );
  }

  // Audience demographics — best effort, IG + FB expose them (TikTok basic API does not).
  try {
    const snap = acc.platform === "instagram" ? await audienceInstagram(acc, token)
      : acc.platform === "facebook" ? await audienceFacebook(acc, token) : null;
    if (snap && hasAudience(snap)) {
      await db.from("audience_snapshots").upsert(
        { account_id: acc.id, platform: acc.platform, captured_on: today(), ...snap },
        { onConflict: "account_id,captured_on" }
      );
    }
  } catch { /* audience insights are optional and permission-gated */ }

  await db.from("social_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", acc.id);
}

/* ------------------------------ Instagram -------------------------------- */
async function syncInstagram(acc: AccountRow, token: string) {
  const prof = await getJson(`${GRAPH}/${acc.external_id}?fields=followers_count,media_count&access_token=${token}`);
  const insights = await getJson(`${GRAPH}/${acc.external_id}/insights?metric=reach,impressions&period=day&access_token=${token}`).catch(() => ({}));
  const reach = pickInsight(insights, "reach");
  const impressions = pickInsight(insights, "impressions");

  const media = await getJson(`${GRAPH}/${acc.external_id}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count,insights.metric(reach,saved,shares,plays)&limit=25&access_token=${token}`).catch(() => ({ data: [] }));
  const posts: Post[] = (media.data ?? []).map((m: any) => {
    const ins = normInsights(m.insights?.data ?? []);
    return {
      external_id: m.id,
      title: (m.caption ?? "Instagram post").slice(0, 120),
      media_type: m.media_type === "VIDEO" ? "Reel" : m.media_type === "CAROUSEL_ALBUM" ? "Carousel" : "Photo",
      permalink: m.permalink ?? null,
      published_at: m.timestamp ?? new Date().toISOString(),
      views: ins.plays ?? ins.reach ?? 0,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      shares: ins.shares ?? 0,
      saves: ins.saved ?? 0,
      reach: ins.reach ?? 0,
      avg_watch_seconds: null,
      retention_pct: null,
    };
  });
  const engagements = posts.reduce((s, p) => s + p.likes + p.comments + p.shares + p.saves, 0);
  return { metric: { followers: prof.followers_count ?? 0, reach, impressions, views: reach, engagements }, posts };
}

async function audienceInstagram(acc: AccountRow, token: string): Promise<Audience> {
  const demo = (breakdown: string) =>
    getJson(`${GRAPH}/${acc.external_id}/insights?metric=follower_demographics&period=lifetime&timeframe=this_month&breakdown=${breakdown}&metric_type=total&access_token=${token}`)
      .then((j) => parseDemographics(j)).catch(() => ({}));

  const [ageRaw, genderRaw, countryRaw] = await Promise.all([demo("age"), demo("gender"), demo("country")]);
  const online = await getJson(`${GRAPH}/${acc.external_id}/insights?metric=online_followers&period=lifetime&access_token=${token}`)
    .then((j) => bucketOnline(j.data?.[0]?.values ?? [])).catch(() => emptyHeat());

  return {
    age: toShares(ageRaw),
    gender: normalizeGender(genderRaw),
    countries: toShares(mapCountryNames(countryRaw)),
    devices: {},
    active_hours: online,
  };
}

/* ------------------------------ Facebook --------------------------------- */
async function syncFacebook(acc: AccountRow, token: string) {
  const prof = await getJson(`${GRAPH}/${acc.external_id}?fields=fan_count,followers_count&access_token=${token}`);
  const insights = await getJson(`${GRAPH}/${acc.external_id}/insights?metric=page_impressions,page_post_engagements&period=day&access_token=${token}`).catch(() => ({}));
  const impressions = pickInsight(insights, "page_impressions");
  const engagements = pickInsight(insights, "page_post_engagements");

  const feed = await getJson(`${GRAPH}/${acc.external_id}/posts?fields=id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true),insights.metric(post_impressions)&limit=25&access_token=${token}`).catch(() => ({ data: [] }));
  const posts: Post[] = (feed.data ?? []).map((m: any) => ({
    external_id: m.id,
    title: (m.message ?? "Facebook post").slice(0, 120),
    media_type: "Post",
    permalink: m.permalink_url ?? null,
    published_at: m.created_time ?? new Date().toISOString(),
    views: pickInsight(m.insights ?? {}, "post_impressions"),
    likes: m.likes?.summary?.total_count ?? 0,
    comments: m.comments?.summary?.total_count ?? 0,
    shares: m.shares?.count ?? 0,
    saves: 0,
    reach: pickInsight(m.insights ?? {}, "post_impressions"),
    avg_watch_seconds: null,
    retention_pct: null,
  }));
  return { metric: { followers: prof.followers_count ?? prof.fan_count ?? 0, reach: impressions, impressions, views: 0, engagements }, posts };
}

async function audienceFacebook(acc: AccountRow, token: string): Promise<Audience> {
  const j = await getJson(`${GRAPH}/${acc.external_id}/insights?metric=page_fans_gender_age,page_fans_country,page_fans_online&period=lifetime&access_token=${token}`).catch(() => ({ data: [] }));
  const rows = j.data ?? [];
  const genderAge = latestValue(rows, "page_fans_gender_age") ?? {};
  const country = latestValue(rows, "page_fans_country") ?? {};
  const online = rows.find((r: any) => r.name === "page_fans_online")?.values ?? [];

  const age: Record<string, number> = {};
  const gender: Record<string, number> = {};
  for (const key of Object.keys(genderAge)) {
    const [g, a] = key.split("."); // e.g. "F.25-34"
    if (a) age[a] = (age[a] ?? 0) + genderAge[key];
    const gk = g === "F" ? "female" : g === "M" ? "male" : "other";
    gender[gk] = (gender[gk] ?? 0) + genderAge[key];
  }
  return {
    age: toShares(age),
    gender: toShares(gender),
    countries: toShares(mapCountryNames(country)),
    devices: {},
    active_hours: bucketOnline(online),
  };
}

/* ------------------------------- TikTok ---------------------------------- */
async function syncTiktok(acc: AccountRow, token: string) {
  const info = await getJson("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = info.data?.user ?? {};
  const listRes = await postJson(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,create_time,share_url,duration",
    { Authorization: `Bearer ${token}` }, { max_count: 20 }
  ).catch(() => ({ data: { videos: [] } }));
  const videos = listRes.data?.videos ?? [];
  const posts: Post[] = videos.map((v: any) => ({
    external_id: String(v.id),
    title: (v.title || "TikTok video").slice(0, 120),
    media_type: "Video",
    permalink: v.share_url ?? null,
    published_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString(),
    views: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
    saves: 0,
    reach: v.view_count ?? 0,
    avg_watch_seconds: v.duration ?? null,
    retention_pct: null,
  }));
  const views = posts.reduce((s, p) => s + p.views, 0);
  const engagements = posts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  return { metric: { followers: user.follower_count ?? 0, reach: views, impressions: views, views, engagements }, posts };
}

/* ------------------------------ helpers ---------------------------------- */
async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
  return body;
}
async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const j = await res.json();
  if (j.error && j.error.code && j.error.code !== "ok") throw new Error(j.error.message || "tiktok_error");
  return j;
}
function pickInsight(insights: any, name: string): number {
  const row = (insights.data ?? []).find((d: any) => d.name === name);
  const v = row?.values?.[0]?.value ?? row?.total_value?.value ?? 0;
  return typeof v === "number" ? v : 0;
}
function normInsights(rows: any[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.name] = r.values?.[0]?.value ?? 0;
  return out;
}
/** Newer IG follower_demographics: data[0].total_value.breakdowns[0].results[]. */
function parseDemographics(j: any): Record<string, number> {
  const out: Record<string, number> = {};
  const breakdowns = j.data?.[0]?.total_value?.breakdowns ?? [];
  for (const b of breakdowns) {
    for (const r of b.results ?? []) {
      const key = (r.dimension_values ?? []).join(" · ");
      if (key) out[key] = (out[key] ?? 0) + (r.value ?? 0);
    }
  }
  return out;
}
function latestValue(rows: any[], name: string): Record<string, number> | null {
  const row = rows.find((r) => r.name === name);
  const values = row?.values ?? [];
  return values.length ? values[values.length - 1].value : null;
}
/** Bucket hourly online-followers values into a [7][24] weekday × hour grid. */
function bucketOnline(values: any[]): number[][] {
  const heat = emptyHeat();
  for (const entry of values) {
    const map = entry?.value;
    if (!map || typeof map !== "object") continue;
    const wd = entry.end_time ? new Date(entry.end_time).getUTCDay() : 0;
    for (let h = 0; h < 24; h++) heat[wd][h] += Number(map[h] ?? map[String(h)] ?? 0);
  }
  return heat;
}
function emptyHeat(): number[][] {
  return Array.from({ length: 7 }, () => Array(24).fill(0));
}
function toShares(obj: Record<string, number>): Record<string, number> {
  const total = Object.values(obj).reduce((s, v) => s + v, 0);
  if (!total) return {};
  const out: Record<string, number> = {};
  for (const k of Object.keys(obj)) out[k] = obj[k] / total;
  return out;
}
function normalizeGender(raw: Record<string, number>): Record<string, number> {
  const mapped: Record<string, number> = {};
  for (const k of Object.keys(raw)) {
    const key = /^f/i.test(k) ? "female" : /^m/i.test(k) ? "male" : "other";
    mapped[key] = (mapped[key] ?? 0) + raw[k];
  }
  return toShares(mapped);
}
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", BR: "Brazil", DE: "Germany", FR: "France",
  IN: "India", ID: "Indonesia", EG: "Egypt", SA: "Saudi Arabia", AE: "UAE", CA: "Canada",
  AU: "Australia", ES: "Spain", IT: "Italy", MX: "Mexico", NG: "Nigeria", TR: "Türkiye",
  JP: "Japan", PH: "Philippines", PK: "Pakistan", NL: "Netherlands", RU: "Russia",
};
function mapCountryNames(raw: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(raw)) out[COUNTRY_NAMES[k] ?? k] = raw[k];
  return out;
}
function hasAudience(a: Audience): boolean {
  return Object.keys(a.age).length > 0 || Object.keys(a.gender).length > 0 ||
    Object.keys(a.countries).length > 0 || a.active_hours.some((r) => r.some((v) => v > 0));
}
