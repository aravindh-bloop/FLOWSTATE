# FlowState — Complete System Documentation

> **Last updated:** 2026-03-12
>
> This document is the single source of truth for how the FlowState coaching
> platform works end-to-end. It covers architecture, user flows, API surface,
> Discord structure, cron jobs, AI integrations, database schema, and local
> development.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Discord Server Structure](#2-discord-server-structure)
3. [Complete User Flow](#3-complete-user-flow)
4. [API Routes Reference](#4-api-routes-reference)
5. [Bot Commands (Discord Slash)](#5-bot-commands-discord-slash)
6. [Cron Jobs (Automated)](#6-cron-jobs-automated)
7. [AI Models Used](#7-ai-models-used)
8. [Tech Stack](#8-tech-stack)
9. [Database Schema (Key Tables)](#9-database-schema-key-tables)
10. [Environment Variables](#10-environment-variables)
11. [Running Locally](#11-running-locally)
12. [Discord Server Reset](#12-discord-server-reset)
13. [Verification Test Codes](#13-verification-test-codes)

---

## 1. Architecture Overview

FlowState is a monorepo at `FLOWSTATE/` managed by **Yarn 4 workspaces**. It
contains four applications and one shared package:

| App | Path | Stack | Default Port |
|-----|------|-------|-------------|
| **API** | `apps/api` | Hono + NeonDB (PostgreSQL) + BetterAuth | 8080 |
| **Bot** | `apps/bot` | discord.js v14 | N/A (connects to Discord gateway) |
| **Landing** | `apps/landing` | Next.js 16 | 3000 |
| **Coach Portal** | `apps/coach` | Next.js 16 + React 19 + Tailwind v4 | 3001 |
| **Shared Env** | `packages/common/env` | Shared environment utilities | N/A |

**How they connect:**

```
Landing Page ──POST /api/registrations──▶ API ◀──BetterAuth──▶ Coach Portal
                                          ▲
                                          │ X-Bot-Token header
                                          │
                                        Bot ◀──Discord Gateway──▶ Discord Server
```

- **Bot-to-API auth:** The bot authenticates to the API using an
  `X-Bot-Token` header, validated by the `requireBot` middleware. Both the bot
  and the API share the same `BOT_INTERNAL_API_TOKEN` secret.
- **Coach/Client auth:** The coach portal and client-facing portal routes use
  BetterAuth bearer tokens, validated by the `requireAuth` middleware.
- **Bot routes** live under `/api/bot/*` and are separate from the
  auth-protected routes used by the portal.

---

## 2. Discord Server Structure

### Full Channel Layout

```
FlowState Server
├── INFO
│   ├── #welcome          (read-only, bot welcome embed)
│   ├── #rules            (read-only, server rules)
│   └── #announcements    (coach + admin can post)
├── GENERAL
│   ├── #general-chat     (all verified members)
│   ├── #introductions    (all verified members)
│   └── #resources        (read-only for clients, coach can post)
├── ADMIN (hidden from non-admins)
│   ├── #admin-chat       (admin discussion)
│   └── #admin-logs       (read-only bot logs)
├── COACH WORKSPACE (hidden, coach + admin only)
│   ├── #dashboard        (bot posts check-in summaries)
│   ├── #alerts           (bot posts urgent flags / intervention notices)
│   └── #weekly-summaries (bot posts weekly AI summaries)
├── VERIFY
│   └── #verify           (verify button, hidden after verified)
├── john-fd283 (per-client category, created on verify)
│   ├── #check-in         (client sends photos/text here)
│   └── #coach-chat       (1-on-1 with coach)
├── jane-2e57b (per-client category)
│   ├── #check-in
│   └── #coach-chat
└── ... (one category per verified client)
```

### Roles Hierarchy

| Role | Assignment | Permissions |
|------|-----------|-------------|
| `@everyone` | Default | No permissions by default |
| `@unverified` | Auto-assigned on join | Can see `#verify` only |
| `@client` | Assigned after verification | Can see GENERAL channels + own category |
| `@coach` | Manual assignment | Can see everything, manage channels |
| `@admin` | Manual assignment | Full administrative access |

### Per-Client Category

When a client verifies, the bot creates a private category named
`firstname-shortid` (e.g., `john-fd283`). The category contains two channels:

- **#check-in** — Topic: "Daily check-ins for {name}". The client posts photos
  and text here. The bot replies with analysis embeds.
- **#coach-chat** — Topic: "1-on-1 coaching for {name}". Private channel for
  direct coach-client conversation.

Permissions are locked to the specific client user, the coach role, the admin
role, and the bot.

---

## 3. Complete User Flow

### Phase 1: Registration

1. Client fills out the registration form on the landing page
   (`localhost:3000`).
2. Form submits `POST /api/registrations` with the client's details.
3. Registration is stored in the database with status `pending`.
4. Coach receives an email notification (via Resend) and a notification in the
   coach portal.
5. The registration appears on the **Approvals** page in the portal.

### Phase 2: Coach Approval

1. Coach logs into the portal at `localhost:3001/approvals`.
2. Reviews the application details and clicks **Approve**.
3. `PATCH /api/registrations/:id/approve` triggers the **provision pipeline**
   (`apps/api/src/pipelines/provision.ts`):
   1. Generate a temporary password for the client.
   2. Create a `users` row with `role = 'client'`.
   3. Create a `clients` row with a **verification code** (6-character
      uppercase alphanumeric, e.g., `FLOW01`).
   4. Discord channel creation is deferred to the verification step.
   5. Generate an Affine workspace ID for the client.
   6. Seed 7 days of calendar events for the client's program.
   7. Send a **welcome email** via Resend containing:
      - Discord server invite link
      - Verification code (e.g., `FLOW01`)
      - Portal login credentials (email + temp password)
   8. Mark the registration as `approved`.
   9. Create a coach notification confirming the approval.

### Phase 3: Discord Verification

1. Client clicks the Discord invite link in the welcome email and joins the
   server.
2. Bot detects `guildMemberAdd` event:
   - Auto-assigns the `@unverified` role.
   - Sends a welcome DM to the new member.
3. Client navigates to the `#verify` channel.
4. Client clicks the "Verify Account" button (or types `!register CODE`).
5. A modal appears prompting the client to enter their verification code.
6. Bot calls `POST /api/bot/verify` with the code and Discord user ID:
   - Validates the code against the `clients` table (status must be
     `pending`).
   - Updates the client record: `status = 'active'`, stores `discord_user_id`.
   - Creates the per-client Discord category:
     - **Category:** `firstname-shortid` (hidden from `@everyone`).
     - **#check-in** channel (topic: "Daily check-ins for {name}").
     - **#coach-chat** channel (topic: "1-on-1 coaching for {name}").
   - Sets permissions: client user + coach role + admin role + bot.
7. Bot assigns the `@client` role and removes the `@unverified` role.
8. A success embed is displayed to the user in `#verify`.

### Phase 4: Daily Check-ins

#### Photo Check-in

1. Client sends a photo in their `#check-in` channel.
2. Bot detects an image attachment and adds a "hourglass" reaction.
3. Photo is uploaded to **Cloudflare R2** (`apps/bot/src/r2.ts`).
4. **Gemini Flash 2.0** (`apps/bot/src/gemini.ts`) analyzes the photo for:
   - Adherence score
   - Energy rating
   - Sleep hours estimate
   - Exercise completed (yes/no)
   - Morning light exposure
   - Caffeine cutoff compliance
   - Narrative analysis
5. Check-in is saved to the database via `POST /api/bot/checkin`.
6. API updates the client's streak count and recalculates rolling 7-day
   adherence.
7. API runs the **alert pipeline** asynchronously (see Phase 5).
8. Bot replies with a rich embed containing the analysis and current streak.
9. Bot posts a summary to the `#dashboard` channel for the coach.
10. The "hourglass" reaction is swapped for a "checkmark" reaction.

#### Text Check-in

1. Client sends a text message in their `#check-in` channel.
2. Bot parses the text for energy, focus, and sleep ratings
   (`apps/bot/src/handlers/text-checkin.ts`).
3. Check-in is saved to the database, streak is updated.
4. Bot replies with a rich embed and posts to `#dashboard`.

### Phase 5: Automated Alert Pipeline

After every check-in or missed check-in, the alert pipeline
(`apps/api/src/pipelines/alert.ts`) runs:

1. Recalculates the 7-day rolling adherence percentage.
2. Checks trigger conditions against thresholds:

| Trigger Code | Condition | Action |
|-------------|-----------|--------|
| `INT-02` | 2 consecutive missed check-ins | Gentle nudge intervention |
| `INT-03` | 3+ consecutive missed check-ins | Escalated concern intervention |
| `INT-04` | Rolling adherence < 80% | Low adherence intervention |
| `INT-06` | Sleep < 6hr average over 3 days | Sleep declining intervention |
| `INT-10` | 7-day streak with >= 90% adherence | Praise / positive reinforcement |

3. **Groq llama-3.3-70b** personalizes the intervention message based on the
   client's history and the trigger condition.
4. Creates a `pending` intervention in the database with the AI-drafted
   message.
5. Sets the `intervention_flag` on the client record.
6. Creates a coach notification alerting them to the new intervention.
7. The intervention appears on the **Interventions** page in the coach portal.

### Phase 6: Intervention Delivery

1. Coach reviews AI-generated interventions in the portal at
   `localhost:3001/interventions`.
2. Coach approves the intervention (optionally edits the message first).
3. The bot's **delivery poller** (`apps/bot/src/jobs/deliveries.ts`) runs every
   60 seconds and picks up approved interventions via
   `GET /api/bot/pending-deliveries`.
4. For each approved intervention:
   - Posts a rich embed to the client's `#check-in` Discord channel.
   - Posts a notification to the `#alerts` channel.
   - Confirms delivery via `PATCH /api/bot/delivered/:id`.

### Phase 7: Weekly Summaries

1. A cron job runs every **Sunday at 1:00 AM**
   (`apps/api/src/jobs/weekly-summary.ts`).
2. **Claude (Anthropic)** generates narrative summaries for each active client,
   including:
   - Adherence trends over the past week
   - Focus areas and areas of improvement
   - Coaching recommendations for the coming week
3. Summaries are saved to the `weekly_summaries` table.
4. Posted to the `#weekly-summaries` Discord channel.
5. Available in the coach portal at `localhost:3001/summaries`.

---

## 4. API Routes Reference

### Public Routes

> Registration routes are currently **PUBLIC** (no auth) for testing.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/registrations` | Submit a new registration form |
| `GET` | `/api/registrations` | List registrations (filterable by status) |
| `PATCH` | `/api/registrations/:id/approve` | Approve a registration (triggers provision) |
| `PATCH` | `/api/registrations/:id/reject` | Reject a registration |

### Auth Routes (BetterAuth)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/sign-in` | Login with email + password |
| `GET` | `/api/auth/get-session` | Get current authenticated session |
| `POST` | `/api/auth/change-password` | Change password |

### Coach Routes (requireAuth + coach role)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard/coach` | Coach dashboard data (stats, recent activity) |
| `GET` | `/api/clients` | List all clients |
| `GET` | `/api/clients/:id` | Client detail |
| `GET` | `/api/clients/:id/checkins` | Client check-in history |
| `GET` | `/api/interventions` | List all interventions |
| `POST` | `/api/interventions` | Create a new intervention manually |
| `PATCH` | `/api/interventions/:id/approve` | Approve an intervention for delivery |
| `GET` | `/api/summaries` | List weekly summaries |
| `POST` | `/api/summaries/generate` | Manually trigger summary generation |
| `GET` | `/api/notifications` | Coach notifications |
| `GET` | `/api/templates` | Intervention templates |
| `GET` | `/api/calendar` | Calendar events |

### Client Routes (requireAuth + client role)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard/client` | Client dashboard data |

### Bot Routes (requireBot via X-Bot-Token)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bot/client-by-channel/:channelId` | Resolve a client from a Discord channel ID |
| `GET` | `/api/bot/client/:clientId` | Get client status and details |
| `GET` | `/api/bot/client/:clientId/summaries` | Get client's weekly summaries |
| `PATCH` | `/api/bot/client/:clientId/pause` | Pause a client's reminders |
| `POST` | `/api/bot/checkin` | Submit a check-in (photo or text) |
| `POST` | `/api/bot/missed-checkin` | Report a missed check-in |
| `GET` | `/api/bot/pending-deliveries` | Get approved interventions awaiting delivery |
| `PATCH` | `/api/bot/delivered/:id` | Confirm an intervention was delivered |
| `GET` | `/api/bot/pending-reminders` | Get clients due for a check-in reminder |
| `POST` | `/api/bot/verify` | Verify a Discord user with their code |

---

## 5. Bot Commands (Discord Slash)

All slash commands are **coach-only** (requires a role starting with "coach").
Defined in `apps/bot/src/commands/index.ts`.

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/status` | `client_id` (required) | Get a client's adherence %, consecutive missed count, and last check-in time |
| `/summary` | `client_id` (required) | Get the latest weekly AI summary for a client |
| `/checkin` | `client_id` (required), `type` (optional: Morning/Evening) | Manually send a check-in reminder prompt to a client's channel |
| `/pause` | `client_id` (required), `days` (optional: 1-30) | Pause a client's check-in reminders |

---

## 6. Cron Jobs (Automated)

All cron jobs run inside the API process using `node-cron`. They are registered
in `apps/api/src/jobs/index.ts`.

| Schedule | Cron Expression | Job | File | Purpose |
|----------|----------------|-----|------|---------|
| Every 15 min | `*/15 * * * *` | AM Check-in Reminders | `reminders.ts` | Send morning check-in prompts to clients at their scheduled time |
| Every 15 min | `*/15 * * * *` | PM Check-in Reminders | `reminders.ts` | Send evening check-in prompts to clients at their scheduled time |
| Every hour | `0 * * * *` | Missed Check-in Detector | `missed.ts` | Flag clients who missed their check-in window and trigger alert pipeline |
| Daily midnight | `0 0 * * *` | Phase Transition | `phase-transition.ts` | Move clients to the next program week/day |
| Sunday 1:00 AM | `0 1 * * 0` | Weekly Summary Generator | `weekly-summary.ts` | Claude AI generates weekly narrative summaries per client |
| Daily 8:00 AM | `0 8 * * *` | Milestone Trigger | `milestone.ts` | Check for and award achievement milestones |
| Monday midnight | `0 0 * * 1` | Calendar Hydrator | `calendar-hydrate.ts` | Seed the next week's calendar events for all active clients |

The bot also runs its own poller:

| Schedule | Job | File | Purpose |
|----------|-----|------|---------|
| Every 60 seconds | Delivery Poller | `apps/bot/src/jobs/deliveries.ts` | Picks up approved interventions and delivers them as Discord embeds |

---

## 7. AI Models Used

| Model | Provider | Purpose | Integration Point |
|-------|----------|---------|-------------------|
| **Gemini Flash 2.0** | Google | Photo check-in analysis (adherence scoring, energy/sleep/exercise detection) | `apps/bot/src/gemini.ts` |
| **llama-3.3-70b** | Groq | Intervention message personalization | `apps/api/src/pipelines/alert.ts` |
| **Claude** | Anthropic | Weekly narrative summary generation | `apps/api/src/jobs/weekly-summary.ts` |

---

## 8. Tech Stack

| Component | Technology |
|-----------|-----------|
| API Framework | Hono (TypeScript) |
| Database | NeonDB (serverless PostgreSQL) |
| Authentication | BetterAuth |
| Discord Bot | discord.js v14 |
| Coach Portal | Next.js 16 + React 19 |
| CSS Framework | Tailwind v4 (base) + inline styles |
| Photo Storage | Cloudflare R2 (S3-compatible) |
| Email Service | Resend |
| Cron Scheduler | node-cron |
| Package Manager | Yarn 4 (workspaces) |
| Runtime | Node.js with tsx (TypeScript execution) |

### Coach Portal Color Scheme

| Element | Color |
|---------|-------|
| Background | `#0f172a` |
| Accent / Primary | `#0fa884` |
| Cards | `#1e293b` |
| Borders | `#334155` |

---

## 9. Database Schema (Key Tables)

### users

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | TEXT | Unique email address |
| `name` | TEXT | Display name |
| `role` | TEXT | `coach` or `client` |

### clients

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `coach_id` | UUID | FK to `users` (assigned coach) |
| `full_name` | TEXT | Client's full name |
| `discord_user_id` | TEXT | Discord snowflake ID (set on verify) |
| `discord_channel_id` | TEXT | The #check-in channel ID |
| `discord_verification_code` | TEXT | 6-char uppercase alphanumeric code |
| `program_week` | INT | Current program week |
| `program_day` | INT | Current day within the week |
| `status` | TEXT | `pending`, `active`, `paused`, `completed` |
| `streak_count` | INT | Consecutive check-in days (resets to 0 on miss) |
| `rolling_7d_adherence` | NUMERIC | 7-day rolling adherence percentage |
| `consecutive_missed_checkins` | INT | Number of consecutive missed check-ins |
| `intervention_flag` | BOOLEAN | Whether an active intervention exists |
| `targets` | JSONB | Client-specific adherence targets |

### registrations

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `full_name` | TEXT | Applicant name |
| `email` | TEXT | Applicant email |
| `status` | TEXT | `pending`, `approved`, `rejected` |
| `onboarding_data` | JSONB | Additional registration form data |

### check_ins

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to `clients` |
| `type` | TEXT | `photo` or `text` |
| `photo_url` | TEXT | R2 URL (for photo check-ins) |
| `ai_analysis` | JSONB | Full Gemini analysis result |
| `adherence_score` | NUMERIC | Score from AI analysis |
| `energy` | INT | Energy rating |
| `focus` | INT | Focus rating |
| `sleep` | NUMERIC | Sleep hours |
| `created_at` | TIMESTAMP | When the check-in was submitted |

### interventions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to `clients` |
| `trigger_condition` | TEXT | Trigger code (e.g., `INT-03`, `INT-06`) |
| `draft_message` | TEXT | AI-generated draft message |
| `final_message` | TEXT | Coach-edited final message |
| `status` | TEXT | `pending`, `approved`, `sent` |

### weekly_summaries

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to `clients` |
| `week_number` | INT | Program week number |
| `ai_narrative` | TEXT | Claude-generated narrative summary |
| `avg_adherence` | NUMERIC | Average adherence for the week |

### calendar_events

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to `clients` |
| `title` | TEXT | Event title |
| `type` | TEXT | Event type (check-in, milestone, etc.) |
| `scheduled_at` | TIMESTAMP | When the event is scheduled |
| `status` | TEXT | Event status |

### notifications

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `type` | TEXT | Notification type |
| `title` | TEXT | Notification title |
| `body` | TEXT | Notification body |

### program_phases

| Column | Type | Description |
|--------|------|-------------|
| `week_number` | INT | Week in the program |
| `phase_name` | TEXT | Phase name |
| `targets` | JSONB | Target metrics for this phase |
| `prompts` | JSONB | Check-in prompts for this phase |

---

## 10. Environment Variables

### API (`apps/api/.env`)

```bash
# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ─── BetterAuth ──────────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=replace-with-64-char-hex-secret
BETTERAUTH_URL=https://your-api.railway.app

# ─── Discord (REST + provisioning) ───────────────────────────────────────────
DISCORD_BOT_TOKEN=Bot.your-discord-bot-token-here
DISCORD_GUILD_ID=1234567890123456789
DISCORD_CLIENT_CATEGORY_ID=1234567890123456789
DISCORD_ADMIN_ROLE_ID=1234567890123456789
DISCORD_CLIENT_ROLE_ID=1234567890123456789
DISCORD_INVITE_URL=https://discord.gg/your-invite-code

# ─── Bot internal API token ──────────────────────────────────────────────────
# Must match BOT_INTERNAL_API_TOKEN in apps/bot/.env
BOT_INTERNAL_API_TOKEN=replace-with-long-random-secret-shared-with-bot

# ─── Email (Resend) ─────────────────────────────────────────────────────────
RESEND_API_KEY=re_your-resend-api-key
COACH_EMAIL=coach@yourdomain.com

# ─── AI — Google Gemini (photo analysis) ─────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key

# ─── AI — Groq (intervention personalisation) ────────────────────────────────
GROQ_API_KEY=your-groq-api-key

# ─── AI — Anthropic Claude (weekly summaries) ────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# ─── Cloudflare R2 ──────────────────────────────────────────────────────────
CLOUDFLARE_R2_ACCOUNT_ID=your-cf-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET_NAME=flowstate-checkins
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-public-domain.com

# ─── Server ─────────────────────────────────────────────────────────────────
PORT=8080
BACKEND_URL=https://your-api.railway.app
```

### Bot (`apps/bot/.env`)

```bash
# ─── Discord ─────────────────────────────────────────────────────────────────
DISCORD_BOT_TOKEN=Bot.your-discord-bot-token-here
DISCORD_APPLICATION_ID=1234567890123456789
DISCORD_GUILD_ID=1234567890123456789
DISCORD_CLIENT_CATEGORY_ID=1234567890123456789

# ─── Backend API ─────────────────────────────────────────────────────────────
BACKEND_URL=https://your-api.railway.app

# ─── Bot internal token (must match apps/api/.env) ───────────────────────────
BOT_INTERNAL_API_TOKEN=replace-with-long-random-secret-shared-with-api

# ─── Cloudflare R2 ──────────────────────────────────────────────────────────
CLOUDFLARE_R2_ACCOUNT_ID=your-cf-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET_NAME=flowstate-checkins
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-public-domain.com

# ─── Google Gemini (photo analysis) ─────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key
```

### Shared Secrets

The following values **must match** between both `.env` files:

- `BOT_INTERNAL_API_TOKEN` (API + Bot)
- `DISCORD_BOT_TOKEN` (API + Bot)
- `DISCORD_GUILD_ID` (API + Bot)
- `DISCORD_CLIENT_CATEGORY_ID` (API + Bot)
- All `CLOUDFLARE_R2_*` values (API + Bot)
- `GEMINI_API_KEY` (API + Bot)

---

## 11. Running Locally

```bash
cd "D:/FLOWSTATE DISCORD/FLOWSTATE"

# Start the API server (port 8080)
yarn workspace @flowstate/api dev

# Start the Discord bot (connects to Discord gateway)
yarn workspace @flowstate/bot dev

# Start the Coach Portal (port 3001)
yarn workspace coach-portal dev
```

Each workspace uses `tsx watch` for hot-reloading during development. The API
and bot can also be started via the `.claude/launch.json` dev server
configuration:

- **api:** `node tsx watch apps/api/src/index.ts` (port 8080)
- **bot:** `node tsx watch apps/bot/src/index.ts` (port 0 / no HTTP)
- **coach:** `node next dev -p 3001 FLOWSTATE/apps/coach` (port 3001)

---

## 12. Discord Server Reset

The reset script deletes all existing channels and roles, then recreates the
full server structure from scratch.

```bash
cd "D:/FLOWSTATE DISCORD/FLOWSTATE"
npx tsx apps/bot/src/setup/reset-server.ts
```

**What it does:**

1. Deletes all existing channels in the server.
2. Deletes all custom roles.
3. Recreates all categories and channels (INFO, GENERAL, ADMIN, COACH
   WORKSPACE, VERIFY).
4. Recreates all roles (`@unverified`, `@client`, `@coach`, `@admin`).
5. Sets proper permission overwrites for each channel.
6. Prints the new channel and role IDs to the console.

**After running:** Copy the printed IDs into both `apps/api/.env` and
`apps/bot/.env` to update `DISCORD_GUILD_ID`, `DISCORD_CLIENT_CATEGORY_ID`,
`DISCORD_ADMIN_ROLE_ID`, and `DISCORD_CLIENT_ROLE_ID`.

Additional setup scripts in `apps/bot/src/setup/`:

- `add-channels.ts` — Add channels to an existing server without resetting.
- `add-missing-channels.ts` — Add only channels that do not already exist.

---

## 13. Verification Test Codes

The following test codes are currently seeded in the database for development
and testing:

| Code | Client Name |
|------|-------------|
| `FLOW01` | Full Discord Test |
| `FLOW02` | ronaldo |
| `VEQAW6` | Final Discord Test |

**IMPORTANT:** Verification codes are **CASE-SENSITIVE** and must be entered in
**uppercase** exactly as shown above.

---

## Appendix: Key File Locations

| Purpose | Path |
|---------|------|
| API entry point | `apps/api/src/index.ts` |
| API routes | `apps/api/src/routes/*.ts` |
| API middleware | `apps/api/src/middleware/` |
| API cron jobs | `apps/api/src/jobs/` |
| Provision pipeline | `apps/api/src/pipelines/provision.ts` |
| Alert pipeline | `apps/api/src/pipelines/alert.ts` |
| AI integrations (API) | `apps/api/src/ai/` |
| Auth config | `apps/api/src/auth.ts` |
| Database config | `apps/api/src/db.ts` |
| Bot entry point | `apps/bot/src/index.ts` |
| Bot commands | `apps/bot/src/commands/index.ts` |
| Photo handler | `apps/bot/src/handlers/photo.ts` |
| Text check-in handler | `apps/bot/src/handlers/text-checkin.ts` |
| Verify handler | `apps/bot/src/handlers/verify.ts` |
| Gemini integration | `apps/bot/src/gemini.ts` |
| R2 upload | `apps/bot/src/r2.ts` |
| Bot API client | `apps/bot/src/api.ts` |
| Delivery poller | `apps/bot/src/jobs/deliveries.ts` |
| Server reset | `apps/bot/src/setup/reset-server.ts` |
| Coach portal lib | `apps/coach/src/lib/` |
| Coach portal components | `apps/coach/src/components/` |
| Coach portal pages | `apps/coach/src/app/` |
| Coach session provider | `apps/coach/src/lib/session.tsx` |
| Coach API wrapper | `apps/coach/src/lib/api.ts` |
| Coach sidebar | `apps/coach/src/components/sidebar.tsx` |
| Coach layout | `apps/coach/src/components/layout.tsx` |
