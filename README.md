# PulseBoard

Production social-media analytics for **Facebook, Instagram and TikTok** — one dashboard for follower growth, reach, engagement, per-post performance and audience insights, pulled from the official platform APIs.

- **Frontend:** React + TypeScript + Vite (self-hosted Inter, hand-built SVG charts)
- **Auth + database:** Supabase (Postgres with row-level security)
- **Backend:** Netlify Functions — OAuth flows + data sync (holds all platform secrets)
- **Hosting:** Netlify (static frontend + serverless functions + a daily scheduled sync)

> **No mock data.** Every number comes from a connected, synced account. Before you connect anything, the app shows empty states — never invented figures.

---

## How it works

```
Browser (React)  ──auth──▶  Supabase Auth
      │                         ▲
      │ reads own rows (RLS)    │ writes (service role)
      ▼                         │
Supabase Postgres  ◀───────  Netlify Functions ──▶ Meta Graph API / TikTok API
                              (OAuth + /api/sync + daily cron)
```

The browser can read only the signed-in user's own rows. OAuth access tokens are written by the serverless functions into `account_secrets`, a table with **no client policies** — so tokens are never exposed to the frontend.

---

## Setup (about 30–45 min, most of it waiting on platform review)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole of [`supabase/schema.sql`](supabase/schema.sql).
3. **Project settings → API** — copy the **Project URL**, the **anon public** key, and the **service_role** key.
4. **Authentication → Providers → Email**: enable it. For a smoother demo you can turn *Confirm email* off (Authentication → Providers → Email → “Confirm email”).

### 2. Meta app (Facebook + Instagram)
Instagram analytics come through the Facebook Graph API, so one Meta app covers both.
1. Create an app at [developers.facebook.com](https://developers.facebook.com) → **Business** type.
2. Add the **Facebook Login** and **Instagram Graph API** products.
3. Facebook Login → **Settings** → add the redirect URI:
   `https://YOUR-SITE.netlify.app/api/oauth-meta-callback`
4. Note the **App ID** and **App Secret** (Settings → Basic).
5. Request these permissions and submit for **App Review** (required for other people's data):
   `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, `instagram_manage_insights`, `business_management`.
6. Instagram must be a **Business/Creator** account linked to a Facebook Page.

### 3. TikTok app
1. Create an app at [developers.tiktok.com](https://developers.tiktok.com).
2. Add **Login Kit** and request the scopes: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`.
3. Add the redirect URI: `https://YOUR-SITE.netlify.app/api/oauth-tiktok-callback`
4. Note the **Client key** and **Client secret**. Submit for review to access production data.

> ⚠️ Until Meta and TikTok **approve** your app, OAuth only works for accounts you add as test users/roles. This is a platform requirement — nothing in this code can bypass it. The app is built to light up the moment approval lands.

### 4. Environment variables
Copy `.env.example` → `.env.local` for local dev, and set the same keys in
**Netlify → Site configuration → Environment variables** for production:

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | anon public key |
| `VITE_SITE_URL` | both | e.g. `https://your-site.netlify.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **secret** — service role |
| `META_APP_ID` / `META_APP_SECRET` | backend | Meta app |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | backend | TikTok app |
| `OAUTH_STATE_SECRET` | backend | any long random string |
| `ANTHROPIC_API_KEY` | backend | **secret** — powers the AI Assistant (`/api/ai`). Optional: leave unset and the Assistant shows a "not configured" message; everything else works. Get one at [console.anthropic.com](https://console.anthropic.com). |

### 5. Deploy
The repo is already wired for Netlify (`netlify.toml`). In Netlify: **Add new site → Import from Git → this repo**. Build command `npm run build`, publish `dist`, functions auto-detected in `netlify/functions`. Set the env vars above, then deploy.

---

## Local development

```bash
npm install
# frontend only:
npm run dev
# frontend + functions together (recommended — /api/* works):
npx netlify dev
```

`npx netlify dev` serves the React app and the functions on one origin so the OAuth redirects and `/api/sync` resolve locally. Set `VITE_SITE_URL=http://localhost:8888`.

---

## Using it
1. Sign up / sign in (Supabase Auth).
2. **Connections** → connect Facebook, Instagram, TikTok via OAuth.
3. Hit **Sync** (or wait for the daily cron) to pull metrics.
4. Explore **Overview / Content / Audience / Platforms**, filter by date range and platform, export CSV.
5. **Planner** — best time to post (from audience-activity), anomaly alerts, and growth **goals** with live progress.
6. **Assistant** — an AI chat that reads your real numbers and answers "why did reach drop?" / "what should I post next?" (needs `ANTHROPIC_API_KEY`).
7. **Reports** — a print-ready PDF report, CSV export, and a **read-only share link** (`/r/<slug>`) anyone can open without an account.
8. Press **⌘K / Ctrl+K** anywhere for the command palette (navigate, sync, export, set range/scope, jump to a post).

## Feature surface
- **Everything runs on real, synced data** — features show empty states until a platform is connected and approved. No mock numbers, anywhere.
- **AI Assistant** is grounded: the browser computes a compact, numbers-only snapshot of your dashboard and sends it to `/api/ai`; Claude answers only from that snapshot (no fabrication, no raw rows or tokens leave the browser).
- **Share links** store a self-contained snapshot in `report_shares` (no tokens, no raw metric rows). The public page reads it through `/api/share` using the service-role key, so there is no anon table access.

## Project structure
```
src/
  components/      UI + charts (LineChart, Sparkline, BarList, StatCard, ReportSheet, CommandPalette, ShareButton, …)
  context/         Auth, Dashboard (data + range/scope), Toast
  lib/             supabase client, api (queries + aggregation), analytics (best-time/alerts/goals/AI summary),
                   snapshot (report builder), reports (CSV), theme, types, format, icons
  pages/           Auth, Overview, Content, Audience, Platforms, Planner, Assistant, Reports, Connections, SharedReport
netlify/functions/
  oauth-meta*.ts   Facebook + Instagram OAuth
  oauth-tiktok*.ts TikTok OAuth
  sync.ts          on-demand sync (per user)
  sync-cron.ts     scheduled daily sync (all users)
  ai.ts            grounded AI assistant (Claude)
  share.ts         create + read public report share links
  _lib.ts / _sync.ts  shared helpers
supabase/schema.sql  tables (+ goals, report_shares) + row-level security
```

## Notes & roadmap
- **Audience snapshots** (age/gender/country/best-time) have a table and UI ready; wiring the IG/FB Audience Insights endpoints into the sync is the next backend step.
- Graph API metric names evolve — the sync stores whatever a call returns and fails softly per account, flagging accounts whose token expired so the UI can prompt a reconnect.
- Tokens are encrypted at rest by Supabase and never leave the backend.
