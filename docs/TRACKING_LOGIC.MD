
---

### `docs/logic/TRACKING_LOGIC.md`
```md
# SafeSteps — Tracking Logic (V1 Canonical)

_Last updated: 2026-01-01_

This document defines the V1 tracking state machine, timer rules, signal-state derivation, and how tracking interacts with sharing and history.

---

## 1) Key Principles

- **No silent tracking**: tracking only runs when the user explicitly enables it.
- **One timer at a time**: never allow multiple intervals to run simultaneously.
- **Emergency overrides**: emergency mode always wins over active tracking.
- **Honest state**: UI state is derived from real GPS/network conditions and successful sends.

---

## 2) States

### 2.1 TrackingMode
- `OFF`
- `ACTIVE`
- `EMERGENCY`

### 2.2 SignalState (derived)
- `ACTIVE` (good)
- `SPOTTY` (degraded)
- `DEAD` (no reliable fix and/or cannot transmit)

SignalState is *not* a mode; it is diagnostics used to inform the user.

---

## 3) Tier Frequency Rules (V1)

These are hard clamps; UI may show presets/custom input depending on tier, but the engine must enforce clamps.

### Guest
- Auto presets: **60s / 2m / 5m**
- Min interval: **60s**
- Max interval: **5m**

### Free account
- Presets: **30s / 60s / 2m / 5m / 10m / 30m / 60m**
- Min interval: **30s**

### Paid account
- Min interval: **15s**
- Max interval: **60m**
- Presets and/or custom input allowed, but always clamped.

---

## 4) Timer Ownership & Safety

### Rules
- Starting `ACTIVE`:
  - clear existing timer
  - set interval timer to selected frequency
- Starting `EMERGENCY`:
  - clear existing timer
  - set emergency interval (tier-defined)
- Stopping tracking:
  - clear timer
  - set mode to `OFF`

### Non-negotiable
- Never create a second timer while one exists.
- Always clear timers on:
  - sign out / exit guest mode
  - app unmount of provider
  - fatal errors

---

## 5) Ping Pipeline

Each ping attempt follows:

1) Acquire location (lat/lng/accuracy + timestamp)
2) Determine ping type:
   - `normal` when mode is `ACTIVE`
   - `emergency` when mode is `EMERGENCY`
3) Persist:
   - guest → local store only
   - authenticated → Supabase `location_pings`
4) Update UI diagnostics:
   - last successful send time
   - last GPS fix time
   - signal state

---

## 6) Signal State Derivation (V1)

Signal state is derived from two independent signals:

- **GPS Fix Health**
  - accuracy meters (lower is better)
  - ability to acquire a fix within a timeout window

- **Transmit Health**
  - ability to successfully write ping to persistence target:
    - authenticated → Supabase insert success
    - guest → local store write success (and if sharing requires relay, relay success)

### Suggested thresholds (tunable)
- `ACTIVE`
  - location fix acquired within timeout (e.g., 8–10s)
  - and last send succeeded within (2 × interval)
- `SPOTTY`
  - location fix is slow OR accuracy is poor (e.g., > 50–100m)
  - OR sends are intermittently failing
- `DEAD`
  - cannot acquire location fix
  - OR cannot send for a sustained period (e.g., > 3 attempts or > 3 × interval)

The UI must avoid claiming delivery when it cannot confirm it.

---

## 7) Emergency Mode (V1)

Emergency is “broadcast share” behavior:
- ping type is `emergency`
- UI uses danger styling (red)
- recipients: all trusted contacts (account-only in V1)
- emergency timer overrides active tracking timer

Stop behavior:
- must be deliberate (confirm or press-and-hold) to prevent accidental shutdown

---

## 8) Sharing Interaction (V1)

### 8.1 Share creation entry points (UX locked)
- Home: `Share Live Location` → navigates to Contacts (no share starts there)
- Shares: `+ New Share` → navigates to Contacts

### 8.2 Share session behavior
- A share session is per recipient and time-bound.
- When a share is active, pings can be used to update the recipient viewer.
- Sharing does **not** automatically enable tracking without explicit user consent.
  - If tracking is OFF, sharing flow must either:
    - ask user to start tracking, or
    - start tracking with a clear banner stating it.

### 8.3 History labeling
History entries must identify:
- `User Ping`
- `Trusted Contact Ping — {Contact Name}`
- `Emergency`

If a ping is associated with a share session, store enough metadata to label it.

---

## 9) History Actions (V1)

Each history row supports:
- `Location Ping`:
  - focus map on that coordinate
  - show marker and accuracy circle
- `Directions`:
  - open OS-level chooser for navigation apps with destination prefilled

---

## 10) Failure Handling

- If ping fails:
  - do not “pretend” success
  - surface a subtle error state (non-alarming unless Emergency)
- If Emergency fails to send:
  - show prominent warning: “Emergency pings are not being delivered”
  - encourage user to call emergency services (V1 copy later)

---
