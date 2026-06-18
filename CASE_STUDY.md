# Job Tracker — Case Study

## Overview

**Job Tracker** is a full-stack web app for managing a job search pipeline. Users track applications on a drag-and-drop Kanban board, visualize progress with analytics, and get per-application AI help for cover letters, follow-ups, and interview prep.

**Live demo:** Replace with your deployed URL  
**GitHub:** [github.com/roren06/job-tracker](https://github.com/roren06/job-tracker)

---

## Problem

Job searching across dozens of roles gets messy fast — spreadsheets don't show pipeline stage at a glance, and it's hard to see trends (how many interviews vs. rejections, activity over time) without manual tracking.

## Solution

A Kanban-style tracker with:

- Six hiring stages (Saved → Applied → Interview → Final → Offer → Rejected)
- Drag-and-drop card management with optimistic UI
- Analytics dashboard (funnel, streaks, rates)
- AI writing assistant tied to each application
- One-click **demo mode** for instant exploration (no signup)

---

## Tech stack

| Area | Choices |
|------|---------|
| Frontend | React 19, TypeScript, Vite, TanStack Query, React Router, dnd-kit |
| Backend | Node.js, Express, Prisma, PostgreSQL |
| Auth | JWT in httpOnly cookies, bcrypt, password reset flow |
| AI | OpenAI API with demo fallback when unavailable |
| Deploy | Vercel (client) + hosted Node API + Neon PostgreSQL |

---

## Architecture

```
React SPA (Vercel)
       │  REST + credentials
       ▼
Express API
       │
       ├── Prisma → PostgreSQL
       └── OpenAI (optional)
```

Session auth uses httpOnly cookies. Cross-site cookie settings adapt based on whether `CLIENT_URL` is HTTPS (production) or localhost (development).

---

## Features I implemented

- **Landing page** with live demo CTA and feature overview
- **Shared app header** across Board and Analytics for consistent navigation
- **Demo seeding** — 10 realistic sample applications reset on each demo login
- **Optimistic drag-and-drop** — cards move instantly; server syncs in background
- **Soft delete** with undo toast
- **AI history** stored per application
- **Dark / light theme** with persisted preference

---

## Challenge: Auth cookies breaking locally

**Symptom:** Add application and other POST requests failed silently in development.

**Cause:** Two issues stacked:

1. Stale compiled `*.js` files in `server/src/` shadowed TypeScript source, so fixes never ran in dev.
2. `NODE_ENV=production` with `CLIENT_URL=http://localhost:5173` set `Secure` cookies that browsers reject on HTTP.

**Fix:**

- Removed stale JS from `server/src/` and gitignored them
- Cookie options now use secure cross-site settings only when `CLIENT_URL` starts with `https://`
- Demo applications seed on every demo login so the board always looks alive

---

## What I'd improve next

- First-run onboarding tooltips for demo users
- CSV export for applications
- E2E tests for auth and CRUD flows
- Split `Board.tsx` into smaller components

---

## Try it

1. Visit the landing page
2. Click **Try Demo** (no account needed)
3. Drag cards between columns, open a card for AI, check **Analytics** from the profile menu

---

*Built by [roren06](https://github.com/roren06)*
