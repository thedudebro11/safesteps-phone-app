# SafeSteps — Tracking Logic

_See also: `docs/TRACKING_LOGIC.MD` for the full canonical V1 spec._

---

## 1. Tracking Modes

Three modes managed by `TrackingProvider`:

- `idle` — no tracking, no timers running
- `active` — periodic GPS pings, user-visible state
- `emergency` — high-frequency pings, red UI, push alerts sent

---

## 2. Mode Behavior

### 2.1 Mode: `idle`

- No periodic GPS calls running.
- Location may be used only for:
  - One-time map centering on Home.
  - One-shot operations (e.g., "Share my location once").
- Tracking interval timers are stopped/cleared.
- UI: "Tracking is OFF."

---

### 2.2 Mode: `active`

- User explicitly turned on "Live Tracking."
- App periodically sends pings to `POST /api/locations`.

**Default interval (v1):** 30s (adjustable by tier).

**Loop behavior (foreground):**
1. Check location permission.
2. If granted: get lat/lng/accuracy via `expo-location`.
3. `POST /api/locations { lat, lng, accuracyM }`
4. Wait `intervalMs`, repeat while `active` and app in foreground.

**Stopping:** user toggles off → mode = `idle`, timers cleared.

---

### 2.3 Mode: `emergency`

- User activated Emergency Mode.
- Pings go to `POST /api/emergency` (writes `mode=emergency`).
- `POST /api/emergency/alert` is called once to send push notifications to trusted contacts.

**Default interval (v1):** 10s.

**Activation flow:**
1. User taps "Emergency Mode".
2. `EmergencyRecipientsModal` selects recipients → creates emergency shares.
3. Set mode to `emergency`.
4. Immediately send one emergency ping: `POST /api/emergency`
5. Call `POST /api/emergency/alert` to notify contacts.
6. Start emergency loop at `intervalMsEmergency`.

**UI feedback:**
- Red highlight, "Emergency Mode is ON."
- Button switches to "Stop Emergency Mode."

**Stopping:** user taps stop → mode → `idle`, timers cleared, emergency shares ended.

---

## 3. Permissions Model

**V1:** "While Using the App" location permission only.

- First use: prompt for permission.
- If denied: show "Location permission is required for tracking."
- If revoked while tracking: stop loop, set mode to `idle`, show error.

Background tracking (via `expo-task-manager`) is available via `src/lib/backgroundLocationTask.ts` but requires explicit user opt-in.

---

## 4. Interval Management

All intervals are managed in `TrackingProvider`. They are cleared when:
- Mode changes to `idle`
- App unmounts the provider
- User signs out

```ts
// Reference values
TRACKING_INTERVALS = {
  activeMs: 30_000,
  emergencyMs: 10_000,
}
```
