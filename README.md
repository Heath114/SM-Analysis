# PulseBoard — Live Social Analytics

A single-page social media analytics dashboard for **Facebook, Instagram, and TikTok**, with a login/signup flow, connect-accounts onboarding, live-updating metrics, an AI insights panel, audience breakdowns, a best-time-to-post heatmap, and a real-time activity feed.

**Live demo:** _(add your Netlify URL here after deploy)_

## Important note

All analytics are **simulated in-browser** for demonstration — the app does not connect to real Facebook/Instagram/TikTok APIs. Login and connected handles are stored in the browser's `localStorage` on the visitor's own device (demo-grade auth, not real security).

## Tech

- One self-contained file: `index.html` (HTML + CSS + vanilla JavaScript, no dependencies, no build step)
- Charts hand-drawn with SVG; colorblind-validated palette in both light and dark themes

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy

Hosted on Netlify as a static site (`netlify.toml` sets the repo root as the publish directory). Connecting this repo in Netlify enables automatic redeploys on every push.
