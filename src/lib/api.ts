import { supabase } from "./supabase";
import type {
  SocialAccount, MetricPoint, ContentItem, AudienceSnapshot, Platform, Range, Scope,
} from "./types";

/** ISO date (YYYY-MM-DD) `days` before today, UTC. */
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchAccounts(): Promise<SocialAccount[]> {
  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .order("connected_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SocialAccount[];
}

export async function fetchMetrics(range: Range): Promise<MetricPoint[]> {
  const { data, error } = await supabase
    .from("metrics_daily")
    .select("account_id,platform,date,followers,reach,impressions,views,engagements")
    .gte("date", isoDaysAgo(range))
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MetricPoint[];
}

export async function fetchContent(): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .order("views", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function fetchAudience(): Promise<AudienceSnapshot[]> {
  const { data, error } = await supabase
    .from("audience_snapshots")
    .select("*")
    .order("captured_on", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AudienceSnapshot[];
}

/** Kicks off a server-side sync (Netlify function) for the signed-in user. */
export async function triggerSync(): Promise<{ ok: boolean; message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, message: "Not signed in." };
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, message: body.message ?? (res.ok ? "Sync started." : "Sync failed.") };
}

/* ----------------------------- aggregation ------------------------------- */

export type MetricKey = "followers" | "reach" | "impressions" | "views" | "engagements";

function scoped(rows: MetricPoint[], scope: Scope): MetricPoint[] {
  return scope === "all" ? rows : rows.filter((r) => r.platform === scope);
}

/** Sum a flow metric per day across the scoped platforms -> [{date, value}]. */
export function seriesByDay(
  rows: MetricPoint[], scope: Scope, key: MetricKey
): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of scoped(rows, scope)) {
    map.set(r.date, (map.get(r.date) ?? 0) + (r[key] ?? 0));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
}

/** Followers is a stock, not a flow: sum the latest value per account per day. */
export function followersByDay(
  rows: MetricPoint[], scope: Scope
): { date: string; value: number }[] {
  const byDate = new Map<string, Map<string, number>>();
  for (const r of scoped(rows, scope)) {
    if (!byDate.has(r.date)) byDate.set(r.date, new Map());
    byDate.get(r.date)!.set(r.account_id, r.followers);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, m]) => ({ date, value: [...m.values()].reduce((s, v) => s + v, 0) }));
}

export function perPlatformSeries(
  rows: MetricPoint[], platforms: Platform[], key: MetricKey
): { platform: Platform; points: { date: string; value: number }[] }[] {
  return platforms.map((p) => ({ platform: p, points: seriesByDay(rows, p, key) }));
}

export function perPlatformFollowers(
  rows: MetricPoint[], platforms: Platform[]
): { platform: Platform; points: { date: string; value: number }[] }[] {
  return platforms.map((p) => ({ platform: p, points: followersByDay(rows, p) }));
}

/** Percentage change of the second half of a window vs the first half. */
export function momentum(series: { value: number }[]): number {
  if (series.length < 4) return 0;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((s, x) => s + x.value, 0);
  const cur = series.slice(series.length - half).reduce((s, x) => s + x.value, 0);
  return prev ? ((cur - prev) / prev) * 100 : 0;
}

/** Growth of a stock series (last vs first). */
export function stockDelta(series: { value: number }[]): number {
  if (series.length < 2) return 0;
  const first = series[0].value, last = series[series.length - 1].value;
  return first ? ((last - first) / first) * 100 : 0;
}

export function sum(series: { value: number }[]): number {
  return series.reduce((s, x) => s + x.value, 0);
}
export function latest(series: { value: number }[]): number {
  return series.length ? series[series.length - 1].value : 0;
}

/** Weighted engagement rate = engagements / reach over the window. */
export function engagementRate(rows: MetricPoint[], scope: Scope): number {
  const s = scoped(rows, scope);
  const eng = s.reduce((a, r) => a + r.engagements, 0);
  const reach = s.reduce((a, r) => a + r.reach, 0);
  return reach ? (eng / reach) * 100 : 0;
}
