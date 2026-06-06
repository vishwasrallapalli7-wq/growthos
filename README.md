# GrowthOS®

**Your business. On autopilot.**

AI-powered digital marketing agency platform — website builds, content approval, CRM, email notifications, Instagram publishing, and marketing automation.

## Features

- **Hero landing** with video background and animated UI
- **Chat onboarding** with Alex (AI account manager)
- **Phase selection** — 5 growth tiers from £9.90/day
- **Pricing page** — monthly vs annual billing (20% annual discount)
- **Signup** — real SQLite accounts + welcome emails
- **Content Studio** — Tinder-style swipe to approve/reject designs & videos
- **Approval pipeline** — voice-over → video render → Instagram → marketing campaign
- **CRM dashboard** — clients, orders, tasks, reports, activity feed
- **Client modal** — campaign stats + live chat with account manager
- **Free website audit** — AI-powered score out of 100
- **Mobile responsive** — bottom tab bar on small screens

## Quick start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Development (frontend :5173 + API :3001)
npm run dev
```

Open http://localhost:5173

## Production

```bash
npm run build
npm run start:server
```

Serves the app + API on http://localhost:3001

## Environment variables

See `.env.example` for all options:

| Variable | Service |
|----------|---------|
| `RESEND_API_KEY` | Transactional emails |
| `ELEVENLABS_API_KEY` | Multilingual voice-over |
| `INSTAGRAM_ACCESS_TOKEN` | Auto-post to Instagram |
| `META_APP_ID` / `META_APP_SECRET` | Instagram OAuth |
| `OPENAI_API_KEY` | AI designs + website audits |

Without API keys, the app runs in dev mode with console/mock fallbacks.

## Tech stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4
- **Backend:** Express 5, SQLite (better-sqlite3)
- **Integrations:** Resend, ElevenLabs, Meta Graph API, OpenAI

## Project structure

```
growthos/
├── src/App.tsx      # Full React application
├── src/api.ts       # API client
├── server/          # Express API + services
│   ├── db.ts        # SQLite schema + seed data
│   └── services/    # email, instagram, voiceover, video, audit
├── data/            # SQLite DB + generated media (gitignored)
└── .env.example     # Environment template
```

## User flow

```
Hero → Chat → Services → Pricing → Signup → Dashboard
         ↘ Free Audit ↗
```

## License

Private — © GrowthOS
