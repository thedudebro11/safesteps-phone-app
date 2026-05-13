# SafeSteps — Tracking Logic (V1 Canonical)

_Last updated: 2026-05-12_

This document defines the V1 tracking state machine, timer rules, signal-state derivation, and how tracking interacts with sharing and history.

---

## 1. Key Principles

- **No silent tracking** — tracking only runs when the user explicitly enables it.
- **One timer at a time** — never allow multiple intervals to run simultaneously.
- **Emergency overrides** — emergency mode always wins over active tracking.
- **Honest state** — UI state is derived from real GPS/network conditions and successful sends.

---

## 2. States

### 2.1 TrackingMode
- `idle` (off)
- `active`
- `emergency`

### 2.2 SignalState (derived)
- `ACTIVE` (good)
- `SPOTTY` (degraded)
- `DEAD` (no reliable fix and/or cannot transmit)

SignalState is diagnostics for the user, not a tracking mode.

---

## 3. Tier Frequency Rules (V1)

These are hard clamps. The engine enforces them regardless of UI input.

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
- Presets and/or custom input allowed, always clamped.

---

## 4. Timer Ownership & Safety

### Rules
- Starting `active`:
  - clear existing timer
  - set interval timer to selected frequency
- Starting `emergency`:
  - clear existing timer
  - set emergency interval (tier-defined)
- Stopping tracking:
  - clear timer
  - set mode to `idle`

### Non-negotiable
- Never create a second timer while one exists.
- Always clear timers on:
  - sign out / exit guest mode
  - app unmount of provider
  - fatal errors

---

## 5. Ping Pipeline

Each ping attempt:

1. Acquire location (lat/lng/accuracy + timestamp)
2. Determine endpoint:
   - `active` mode → `POST /api/locations`
   - `emergency` mode → `POST /api/emergency`
3. Persist:
   - Server writes to `live_presence` (upsert) and `location_history` (insert)
4. Update UI diagnostics:
   - last successful send time
   - last GPS fix time
   - signal state

---

## 6. Signal State Derivation (V1)

Signal state is derived from two independent signals:

- **GPS Fix Health**
  - accuracy meters (lower is better)
  - ability to acquire a fix within a timeout window

- **Transmit Health**
  - ability to successfully write ping to the server

### Suggested thresholds (tunable)
- `ACTIVE`
  - location fix acquired within timeout (8–10s)
  - last send succeeded within (2 × interval)
- `SPOTTY`
  - location fix is slow OR accuracy is poor (> 50–100m)
  - OR sends are intermittently failing
- `DEAD`
  - cannot acquire location fix
  - OR cannot send for a sustained period (> 3 attempts or > 3 × interval)

The UI must avoid claiming delivery when it cannot confirm it.

---

## 7. Emergency Mode (V1)

Emergency is high-frequency, clearly-labeled mode:
- Pings go to `POST /api/emergency` (writes `mode=emergency`)
- `POST /api/emergency/alert` is called separately to send push notifications to trusted contacts
- UI uses danger styling (red)
- Emergency timer overrides active tracking timer

Stop behavior:
- Must be deliberate (confirm or press-and-hold) to prevent accidental shutdown

---

## 8. Sharing Interaction (V1)

### 8.1 Share creation entry points (UX locked)
- Home: `Share Live Location` → navigates to Contacts (no share starts there)
- Shares: `+ New Share` → navigates to Contacts

### 8.2 Share session behavior
- A share session is per recipient and time-bound.
- Sharing does **not** automatically enable tracking without explicit user consent.
  - If tracking is OFF, the flow must ask the user to start tracking.

### 8.3 Active tracking stop ends live shares
When tracking transitions from `active` → `idle`, `TrackingProvider.stopAll()` calls `SharesProvider.endAllLiveShares()` so the UI cannot remain in a "SHARING" state while tracking is off.

Emergency shares are handled separately through `emergencySync.ts`.

---

## 9. Live Visibility Boost Logic

When tracking transitions from idle → active or emergency:

1. Detect transition via previous state ref.
2. Trigger an immediate fetch of visible users.
3. Enable a 12-second boost polling window (1s intervals).
4. After boost, polling returns to 5-second base interval.

`inFlightRef` prevents overlapping network calls. Polling is disabled entirely while idle.

---

## 10. Failure Handling

- If ping fails:
  - do not "pretend" success
  - surface a subtle non-alarming error state
- If Emergency fails to send:
  - show prominent warning: "Emergency pings are not being delivered"
  - encourage user to call emergency services
