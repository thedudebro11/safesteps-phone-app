# SafeSteps

<p align="center">
  <img src="docs/assets/safesteps-logo.png" alt="SafeSteps Logo" width="320" />  
</p>

<p align="center">
  <strong>Privacy-first personal safety & location sharing</strong><br />
  Control when your location is shared. No silent tracking. No dark patterns.
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-pre--v1-informational" />
  <img alt="platform" src="https://img.shields.io/badge/platform-ios%20%7C%20android%20%7C%20web-blue" />
  <img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-green" />
</p>

---

## Overview

**SafeSteps** is a privacy-first personal safety app designed to help users share their location **only when they choose**.

The app is built around a simple but strict philosophy:

- No silent background tracking  
- No third-party analytics  
- No ad networks  
- No hidden data reuse  
- Clear user-controlled states at all times  

Users can:
- Sign in with an account
- Try the app instantly using **Guest Mode**
- Explicitly enable or disable tracking
- Exit guest mode or log out at any time

SafeSteps prioritizes **clarity, control, and safety over surveillance**.

---

## Project Status

**Pre-v1 — Active Development**

Current state:
- Auth + Guest flow complete
- Deterministic route protection implemented
- Settings + logout behavior stable
- Documentation-first development process in place

In progress:
- Home screen tracking UI
- Location ping storage
- Backend API wiring

This repository is under active development and **not yet released to app stores**.

---

### What’s implemented (this update)

✅ Trusted Contacts (local-first)
- Add / remove contacts (name, optional phone/email)
- Stored locally (Web: localStorage, Native: AsyncStorage if installed)

✅ Share Sessions (local-first)
- Create a “share session” for a contact
- One active share per contact
- End share from **Contacts** or **Shares**
- Sessions stored locally (same storage rules)

### Sharing Preconditions (UX Guardrail)

Live location sharing is only allowed when **Active Tracking is running**.

#### Why
A share session without active tracking would be misleading — no location updates would be sent.  
To keep the UX honest and predictable, sharing is gated by tracking state.

#### Behavior
- If tracking mode is `idle`:
  - “Share Live Location” button on Home is **disabled**
  - “Share Location Link” buttons in Contacts are **disabled and dimmed**
  - No share session can be created
- If tracking mode is `active` or `emergency`:
  - Share buttons enable automatically
  - User can start or stop shares normally

#### Implementation
- Gating is UI-level (no prompts, no redirects)
- Uses `TrackingProvider.mode !== "idle"` as the single source of truth
- Share handlers also hard-guard against accidental invocation when disabled

This keeps the app state truthful and avoids creating invalid share sessions.


✅ UX flow
- Home → “Share Live Location” → navigates to Contacts in share mode (`/contacts?share=1`)
- Contacts show SHARING indicator per active session
- Shares tab lists active sessions + End action
- Destructive actions use a cross-platform confirm (works on Web + Native)

## Core Features (Current)

- Email/password authentication (Supabase)
- Guest Mode (local-only usage)
- Centralized route protection
- Explicit logout / exit guest behavior
- Privacy-focused UI and interaction design
- No background tracking without consent

---

## Tech Stack

**Frontend**
- Expo
- React Native
- Expo Router
- TypeScript
- Local-first state via Context Providers
- Storage adapter:
  - Web: localStorage
  - Native: `@react-native-async-storage/async-storage` (optional, recommended)
  - Fallback: in-memory (still functional)

**Backend (in progress)**
- Node.js
- Express
- Supabase (Auth + Postgres + RLS)

**Philosophy**
- Privacy-first by default
- Minimal attack surface
- Deterministic state transitions

---

## Authentication Model

SafeSteps supports two session types:

### Authenticated User
- Backed by Supabase Auth
- Cloud-synced data (future)
- Secure JWT-based API access

### Guest Mode
- Local-only
- No backend writes
- No JWT
- Ideal for “try before signup”

Both are treated as valid sessions for routing purposes.

For full details, see:  
📄 `docs/AUTH_FLOW.md`

---

## Documentation

This project treats documentation as part of the system.

Start here:

- `docs/SAFESTEPS_MASTER_SUMMARY.md` — project brain
- `docs/AUTH_FLOW.md` — auth & guest logic
- `docs/ROADMAP.md` — planned milestones
- `docs/ISSUE_LOG.md` — full debugging history
- `docs/SECURITY_NOTES.md` — security decisions & audits

Docs are kept in sync with code.

---

Data Models
Contact
type Contact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
};

ShareSession
type ShareSession = {
  id: string;
  contactId: string;
  contactSnapshot: { name: string; phone?: string; email?: string };
  status: "live" | "ended";
  startedAt: string;
  endedAt?: string;
};


Why snapshot?

Contacts can change, but share sessions should preserve what was shared at the time.




Web persistence works automatically using localStorage.

## Running the App

```bash
npm install
npx expo start
Installation Notes (important)
Native persistence (recommended)

For iOS/Android persistence across app restarts, install AsyncStorage:

npx expo install @react-native-async-storage/async-storage