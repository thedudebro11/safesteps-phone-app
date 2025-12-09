# SafeSteps – Tracking Logic



## 1. Tracking Modes

The app has three high-level tracking modes:

- `off`
- `active`
- `emergency`

This mode should be managed in a central place (e.g., `TrackingProvider` or similar), so all screens can read the current state and react accordingly.

---

## 2. Mode Behavior

### 2.1 Mode: `off`

**Definition:**

- No periodic GPS calls running.
- No periodic network calls running.
- Location may be used only for:
  - One-time map centering on Home.
  - One-shot operations (e.g., “Share my location once”).

**Behavior:**

- Tracking interval timers are stopped/cleared.
- UI shows:
  - Status: “Tracking is OFF.”
  - Clear message that no live updates are being sent.

**Battery impact:** Minimal.

---

### 2.2 Mode: `active`

**Definition:**

- User has explicitly turned on “Live Tracking” via a toggle/button.
- App periodically sends pings to the backend with `type = "normal"` and `source = "active_tracking"`.

**Default interval (v1):**

- `30s` (can be adjusted later via settings).

**Loop Behavior (foreground-only in v1):**

1. Check if we have location permission.
   - If not, prompt user to grant “While Using the App.”
2. If granted:
   - Call the OS location API (e.g., `expo-location`) to get:
     - `lat`
     - `lng`
     - `accuracy` (if available)
   - Call backend:
     - `POST /api/locations`
     - Body includes `type = "normal"` and `source = "active_tracking"`.
3. Wait for `intervalMs` (e.g., 30,000 ms).
4. Repeat while mode is `active` **and** app is in foreground.

**Failure Handling:**

- If location retrieval fails:
  - Log in dev builds.
  - Show a small non-blocking banner: “Unable to get location, will retry.”
- If network call fails:
  - Same banner: “Unable to send location, will retry.”

**Stopping:**

- User toggles tracking off.
- App explicitly sets mode to `off` and cancels timers.

---

### 2.3 Mode: `emergency`

**Definition:**

- User has activated Emergency Mode via the red emergency button.
- Pings are sent more frequently with `type = "emergency"` and `source = "emergency_mode"`.

**Default interval (v1):**

- `5–10s` (configurable; start with 10s for balance).

**Activation Flow:**

1. User taps **“Emergency Mode”**.
2. Optionally show a confirmation:
   - “Activate Emergency Mode? This will send more frequent emergency location updates.”
3. Set mode to `emergency`.
4. Immediately send one emergency ping:
   - `POST /api/locations` with `type = "emergency"` and `source = "emergency_mode"`.
5. Start emergency loop:
   - Every `intervalMsEmergency` (e.g., 10s) do:
     - Get GPS location.
     - Send emergency ping.

**UI Feedback:**

- Home screen clearly reflects emergency state:
  - Red highlight around map or status card.
  - Text like: “Emergency Mode is ON – sending frequent pings.”
- Emergency button switches to “Stop Emergency Mode.”

**Stopping:**

- User taps “Stop Emergency Mode.”
- Mode transitions:
  - Either to `off`, or
  - Back to `active` if we decide emergency is layered on top of active tracking.
- All emergency timers are cleared.

---

## 3. Permissions Model

**Goal (v1):**

- Use **“While Using the App”** location permission.
- Avoid forcing “Always Allow” for background tracking in v1.
- Make SafeSteps feel user-controlled and battery-friendly.

**Behavior:**

- On first use of tracking:
  - Prompt for “While Using the App” permission.
- If denied:
  - Show a clear message: “Location permission is required for tracking.”
- If revoked while tracking is on:
  - Stop the tracking loop.
  - Set mode to `off`.
  - Show an error state.

Later versions (v2+) may optionally introduce background tracking with explicit explanations and opt-in.

---

## 4. Interval Management

All tracking intervals should be:

- Managed in a single tracking logic module/provider.
- Cleared when:
  - Mode changes to `off`.
  - App unmounts the tracking provider.
- Configurable from a single config object, e.g.:

```ts
export const TRACKING_INTERVALS = {
  activeMs: 30000,
  emergencyMs: 10000,
};
