# SafeSteps — Roadmap

_Last updated: 2026-01-01_

This roadmap reflects the **locked V1 UX/UI**:
Tabs: Home / Contacts / Shares / History / Settings.

---

## V1 (Ship)

### V1 Goals
- A privacy-first, consent-driven location sharing app with:
  - real-time “Now” map + tracking state
  - emergency mode (account-only)
  - recipient-specific live location sharing (share sessions)
  - location history with map focus + directions

### V1 Milestones (Build Order)
1) **Database schema + RLS**
   - `trusted_contacts`
   - `location_pings`
   - `share_sessions`
   - `share_recipients` (token hashes)
2) **Tracking provider (single timer)**
   - OFF / ACTIVE / EMERGENCY
   - tier-based frequency clamps
   - emergency override
   - signal state derivation (Active/Spotty/Dead)
3) **Home screen wiring**
   - status, frequency, actions
   - coordinates + accuracy + last update
   - map + accuracy circle
4) **Contacts**
   - add/list/remove trusted contacts
   - start share per contact (`Share Location Link`)
   - show contact row state when sharing
5) **Shares**
   - list active sessions
   - status pill (LIVE/STALE)
   - expiration countdown
   - revoke/end/manage
   - `+ New Share` funnels to Contacts flow
6) **History**
   - list logs with time/place/type/contact
   - per-row `Location Ping` + `Directions`
7) **Hardening**
   - token hashing, revocation, expiration enforcement
   - rate limits (share creation, token checks)
   - robust error handling + honest UI states
   - release checklist

### Explicit non-goals in V1
- always-on background tracking
- danger detection / “kidnapping detection”
- full family map / continuous mutual tracking
- ads, analytics, telemetry

---

## V2 (Stabilize + Expand)

- Share viewer page improvements (recipient controls: stop receiving/block)
- Optional push notifications (share started/stopped, emergency started)
- Premium management polish + billing integration
- Better offline behavior + queueing
- Extended history tiers (7–30 days)

---

## V3 (Advanced)

- Family/circle mutual sharing (explicit sessions, never ambient)
- Background tracking (opt-in “Ready Mode” concept, if ever)
- Advanced abuse prevention heuristics
- Hardware add-ons / integrations (future)

---
