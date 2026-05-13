# SafeSteps Documentation Index

_Last updated: 2026-05-12_

Master directory of SafeSteps documentation.

---

## Core Reference (Read These First)

- **[SAFESTEPS_MASTER_SUMMARY.md](./SAFESTEPS_MASTER_SUMMARY.md)**
  Vision, tiers, UX/UI principles, design language, architecture overview.

- **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)**
  End-to-end system map: Express API, Supabase tables, mobile layers, data flows, polling strategy.

- **[AUTH_FLOW.md](./AUTH_FLOW.md)**
  Current auth implementation + full guest mode implementation spec (Part 2, planned).

- **[db/DB_SCHEMA.md](./db/DB_SCHEMA.md)**
  All Supabase tables with columns, constraints, RLS. Authoritative schema reference.

- **[api/API_SPEC.md](./api/API_SPEC.md)**
  All Express API endpoints with request/response shapes. Backend is Express on Railway (not Supabase-direct).

- **[ENGINEERING_INVARIANTS.md](./ENGINEERING_INVARIANTS.md)**
  Rules that must never be violated: history is append-only, presence is ephemeral, safeRun() wraps all async press handlers, etc.

- **[SECURITY_NOTES.md](./SECURITY_NOTES.md)**
  Threat model, security decisions, hardening status and TODOs.

---

## Feature Docs

- **[TRACKING_LOGIC.MD](./TRACKING_LOGIC.MD)**
  Canonical tracking state machine, timer rules, signal state, emergency/sharing interaction. _(Use this one.)_

- **[logic/TRACKING_LOGIC.md](./logic/TRACKING_LOGIC.md)**
  Supplementary tracking mode behavior detail.

- **[LIVE_VISIBILITY_SYSTEM.md](./LIVE_VISIBILITY_SYSTEM.md)**
  Live presence, visibility toggle system, polling architecture, boost logic.

- **[TIERS.md](./TIERS.md)**
  Guest / Free / Premium tier limits and enforcement points.

- **[guest-vs-registered-vs-premium.md](./guest-vs-registered-vs-premium.md)**
  Tier comparison table and what each tier can/cannot do.

- **[sharing-and-emergency.md](./sharing-and-emergency.md)**
  Emergency mode + shares sync invariant. Critical for the emergency/share coupling.

- **[sharing-and-tracking.md](./sharing-and-tracking.md)**
  Relationship between tracking state and share session availability.

- **[local-first-contacts.shares.md](./local-first-contacts.shares.md)**
  Current contacts/shares architecture (server-backed). Planned DB-backed share sessions.

---

## Architecture & Structure

- **[architecture/STRUCTURE.md](./architecture/STRUCTURE.md)**
  Folder structure, file responsibilities, tech stack, key design decisions.

- **[DESIGN_GUIDE.md](./DESIGN_GUIDE.md)**
  Colors, components, screen responsibilities, UI semantics.

---

## Planning & Ops

- **[NEXT_UP.md](./NEXT_UP.md)**
  Completed features + prioritized backlog.

- **[ROADMAP.md](./ROADMAP.md)**
  V1 build order and future phases.

- **[CHANGELOG.md](./CHANGELOG.md)**
  Running project changes.

- **[ISSUE_LOG.md](./ISSUE_LOG.md)**
  Bugs and decisions.

- **[performance/PERFORMANCE_NOTES.md](./performance/PERFORMANCE_NOTES.md)**
  Performance expectations, polling guardrails, silent refresh rules.

- **[BUILDING_SAFESTEPS_NOTES.md](./BUILDING_SAFESTEPS_NOTES.md)**
  Developer journal and running notes.

---

## Important: Known Stubs

Before writing any code, see `CLAUDE.md` in the repo root for the list of intentional hardcoded stubs (`isGuest=false`, `isPremium=false`) and key architecture facts that every agent must know.
