# SafeSteps — Agent System

_Last updated: 2026-05-12_

This document defines the multi-agent build system for taking SafeSteps from its current state to full production release on the App Store and Google Play.

---

## How the Agent System Works

Each agent is a specialized Claude instance launched to complete a specific domain of work. Agents communicate through documentation — every agent reads a shared status file before starting and writes back to it when done. No agent assumes anything about what another agent has done without reading STATUS.md first.

### The Communication Protocol

**Before starting any work:**
1. Read `CLAUDE.md` (project rules, known stubs)
2. Read `docs/agents/STATUS.md` (current progress across all agents)
3. Read your own agent doc (e.g., `docs/agents/AGENT_BACKEND.md`)
4. Read all "Prerequisites" docs listed in your agent doc
5. Run a targeted grep/read of the specific files you'll be touching

**While working:**
- Update `docs/agents/STATUS.md` as you complete each task
- When you modify source code, update the corresponding doc in `docs/`

**When done:**
- Mark all completed tasks in STATUS.md
- Document anything that blocks a downstream agent
- Note any decisions made that deviate from specs

---

## Agent Roster

| Agent | Doc | Domain | Depends On |
|---|---|---|---|
| **Coordinator** | `AGENT_COORDINATOR.md` | Orchestration, progress tracking, final QA | All others |
| **Database** | `AGENT_DATABASE.md` | Supabase migrations, RLS, schema | None — run first |
| **Backend** | `AGENT_BACKEND.md` | Express API hardening, Zod, rate limiting, share sessions | Database |
| **Auth & Guest** | `AGENT_AUTH_GUEST.md` | Guest mode implementation | Backend |
| **Frontend** | `AGENT_FRONTEND.md` | All screens, UI polish, design compliance | Auth & Guest |
| **Premium** | `AGENT_PREMIUM.md` | Membership screen, isPremium wiring, tier enforcement | Frontend |
| **Build & Store** | `AGENT_BUILD_STORE.md` | EAS config, app icons, store submissions | Premium |
| **QA** | `AGENT_QA.md` | Testing, launch checklist, final verification | All others |

---

## Recommended Build Order

```
Phase 1: Foundation
  [1] Database Agent    — schema migrations must exist before backend can use them

Phase 2: API & Auth
  [2] Backend Agent     — hardened API, DB-backed shares, Zod, rate limiting
  [3] Auth & Guest Agent — guest mode per AUTH_FLOW.md Part 2

Phase 3: UI
  [4] Frontend Agent    — all screens polished, design guide compliant
  [5] Premium Agent     — membership screen + isPremium wiring

Phase 4: Ship
  [6] Build & Store Agent — EAS builds, store assets, production config
  [7] QA Agent            — end-to-end testing + launch checklist
```

Phases 1–3 can overlap if agents work on independent files. Always check STATUS.md for conflicts.

---

## What This App Is

Read `docs/SYSTEM_ARCHITECTURE.md` for the full picture. Key facts every agent must internalize:

- **SafeSteps / Lume** — privacy-first GPS safety app
- **3 layers:** Expo/RN app → Express API (Railway) → Supabase (Postgres + Auth)
- **Express is the API** — all operations go through the backend, not Supabase client directly
- **DB tables in use:** `profiles`, `trusted_contacts`, `live_presence`, `live_visibility`, `location_history`, `push_tokens`, `emergency_alerts`
- **In-memory shares** — `sharesByToken` Map in `server/index.js` (must be migrated to DB)
- **Known stubs:** `isGuest=false` (hardcoded), `isPremium=false` (hardcoded)
- **Table name:** `location_history` (NOT `location_pings`)

---

## What Production Means for This App

- ✅ All features fully functional (guest mode, premium tiers, sharing, emergency, tracking, history)
- ✅ Server hardened (Zod validation, persistent rate limiting, token hashing)
- ✅ DB-backed share sessions (no more in-memory state)
- ✅ App Store ready (icons, screenshots, privacy policy, EAS build, entitlements)
- ✅ Google Play ready (same + adaptive icons, AAB build)
- ✅ Error boundaries + crash-safe error handling throughout
- ✅ Background tracking properly gated with user opt-in
- ✅ All screens match the design guide (`docs/DESIGN_GUIDE.md`)
- ✅ No hardcoded stubs in production code

---

## File Change Policy

When any agent modifies code, they MUST update the relevant doc:

| Code changed | Doc to update |
|---|---|
| `server/routes/*.js` or `server/index.js` | `docs/api/API_SPEC.md` |
| DB table created or modified | `docs/db/DB_SCHEMA.md` |
| `src/features/auth/AuthProvider.tsx` | `docs/AUTH_FLOW.md` |
| `src/features/tracking/TrackingProvider.tsx` | `docs/TRACKING_LOGIC.MD` |
| `src/features/shares/SharesProvider.tsx` | `docs/local-first-contacts.shares.md` |
| New feature added | `docs/CHANGELOG.md` |
| Bug fixed | `docs/ISSUE_LOG.md` |
| Architecture changes | `docs/SYSTEM_ARCHITECTURE.md` + `docs/architecture/STRUCTURE.md` |
| Any agent task completed | `docs/agents/STATUS.md` |
