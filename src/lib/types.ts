export type Platform = "facebook" | "instagram" | "tiktok";

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  external_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: "connected" | "expired" | "revoked";
  connected_at: string;
  last_synced_at: string | null;
}

/** One day of metrics for one account (rows come from metrics_daily). */
export interface MetricPoint {
  account_id: string;
  platform: Platform;
  date: string; // YYYY-MM-DD
  followers: number;
  reach: number;
  impressions: number;
  views: number;
  engagements: number;
}

export interface ContentItem {
  id: string;
  account_id: string;
  platform: Platform;
  external_id: string;
  title: string;
  media_type: string; // Reel / Video / Photo / Post ...
  permalink: string | null;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  avg_watch_seconds: number | null;
  retention_pct: number | null;
}

export interface AudienceSnapshot {
  account_id: string;
  platform: Platform;
  captured_on: string;
  age: Record<string, number>;    // "18-24" -> share 0..1
  gender: Record<string, number>; // "female"/"male"/"other" -> share
  countries: Record<string, number>;
  devices: Record<string, number>;
  active_hours: number[][];       // [7][24] activity intensity
}

export type Range = 7 | 30 | 90;
export type Scope = "all" | Platform;
