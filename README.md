# DashRite — Dash Backend (dash-api)

This is the small backend that gives Dash its live capabilities. **The neural-TTS
endpoint (`/api/tts`) is complete and ready to deploy** — it gives Bella a genuine,
warm, human voice (not the browser voice). The QuickBooks and bank-feed files are
labeled scaffolds you can finish later; the same deploy hosts them all.

Dash is ALREADY wired to use these — it calls your deploy URL and falls back to the
browser voice / seed data whenever the backend isn't set. Nothing in Dash needs to
change; you only stand up this backend and paste the URL into Dash.

------------------------------------------------------------------
## What you need (one-time, ~10 minutes)
1. A free **Vercel** account  (vercel.com)
2. A free/low-cost **ElevenLabs** account  (elevenlabs.io) — for Bella's voice
3. This `dash-api` folder

------------------------------------------------------------------
## Step 1 — Pick Bella's voice (ElevenLabs)
1. Sign in at elevenlabs.io → **Voices** → **Voice Library**.
2. Warm / young female picks that fit the brief:
   - **Charlotte** — warm, soft, late-20s
   - **Matilda** — warm, friendly, young
   - **Jessica** — expressive, young, conversational
   - **Sarah** — soft, calm, professional
3. Click a voice → **Add to My Voices**, then open it and copy its **Voice ID**
   (a long string like `XB0fDUnXU5powFXDhCwa`). Keep it for Step 3.
4. Profile → **API Keys** → create a key. Copy it for Step 3.

------------------------------------------------------------------
## Step 2 — Deploy this folder to Vercel
Easiest (no terminal):
1. Put this `dash-api` folder in its own GitHub repo (e.g. `dash-api`).
2. vercel.com → **Add New… → Project** → import that repo.
3. Framework preset: **Other**. Root directory: leave as the repo root
   (the `api/` folder is auto-detected). Click **Deploy**.
4. When it finishes you get a URL like `https://dash-api-xxxx.vercel.app`.

------------------------------------------------------------------
## Step 3 — Add your keys (server-side only — never in Dash)
In Vercel → your project → **Settings → Environment Variables**, add:

| Name                  | Value                                   |
|-----------------------|-----------------------------------------|
| ELEVENLABS_API_KEY    | (your ElevenLabs key)                   |
| ELEVENLABS_VOICE_ID   | (the Voice ID you copied)               |
| ALLOW_ORIGIN          | https://196969.github.io                |

Then **Deployments → … → Redeploy** so the keys take effect.

------------------------------------------------------------------
## Step 4 — Point Dash at it
1. Open Dash → top-right **Apps → Connectors**.
2. In the TTS / deploy-URL field, paste your Vercel base URL
   (e.g. `https://dash-api-xxxx.vercel.app`) and save.
3. Talk to Dash / Bella now streams the ElevenLabs voice. If the backend is ever
   unreachable, Dash automatically falls back to the browser voice — nothing breaks.

Quick test: visit `https://YOUR-VERCEL-URL/api/tts` in a browser — you should see
`Use POST` (that means it's live). Dash sends the POST for you.

------------------------------------------------------------------
## Cost note
ElevenLabs has a free tier (~10k characters/month) — plenty for testing. Paid tiers
start around $5/mo. Vercel hobby tier is free for this usage.

------------------------------------------------------------------
## Files
- `api/tts.js` .......... COMPLETE — neural voice for Bella (ElevenLabs)
- `api/status.js` ....... scaffold — QBO connection status (returns false until wired)
- `vercel.json` ......... function config
- `package.json` ........ Node 18+
- `.env.example` ........ the env vars to set in Vercel

## Later (optional): QuickBooks + bank feed
The same deploy can host `/api/connect`, `/api/callback`, `/api/qbo` (QuickBooks
OAuth + report proxy) and `/api/bankfeed` (via Plaid). Those need an Intuit developer
app and/or a Plaid account. Say the word and these get built out the same way —
Dash already calls them and falls back cleanly until they're live.
