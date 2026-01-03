# SafeSteps — Design Guide (V1)

## 1) Visual Identity

**Theme:** dark, calm, safety-tech.  
SafeSteps should feel like a **protective instrument panel**, not a social app and not surveillance software.

Design priorities:
- Clear state, low noise
- High contrast
- Strong separation between **normal** actions (blue) and **emergency** actions (red)

---

## 2) Color System (Locked)

- Background: `#050814`
- Card: `#0c1020`
- Border: `#1a2035`
- Primary/Accent: `#3896ff`
- Muted text: `#a6b1cc`
- Danger: `#ff4b5c`

Semantic use:
- **Blue** = normal, safe, controllable
- **Red** = emergency, high consequence
- **Green pills/dots** = LIVE/ACTIVE (status only; not a primary brand color)
- **Muted gray** = informational

---

## 3) Layout Rules

- Layout style: **stacked cards** over a dark background
- Cards:
  - Rounded corners (14–18px)
  - Subtle border + soft shadow/glow
- Typography:
  - Large, bold screen titles
  - Subtitles use muted text
  - Avoid playful type ramps

---

## 4) Navigation (Locked)

Bottom tabs (always visible, never cropped in mocks):
- Home
- Contacts
- Shares
- History
- Settings

Icons: simple line icons, muted when inactive, accent when active.

---

## 5) Home Screen (Paid User) — “Now”

Home only contains:
- Tracking control card
- Signal state (Active / Spotty / Dead)
- Lat/Lng + accuracy + last update time
- Map with accuracy circle

Primary actions on Home:
- Start/Stop Active Tracking (blue)
- Emergency (red)
- **Share Live Location** (blue; navigates to Contacts)

Home does **not** contain:
- Active shares list
- History list

---

## 6) Contacts Screen — “Who can I share with?”

Contact row shows:
- Avatar initial
- Name
- Phone
- Optional email

Row action:
- `Share Location Link`

Row state when sharing:
- pill/dot: `SHARING` or `LIVE`
- button changes to disabled or `Manage`

---

## 7) Shares Screen — “Who is seeing me right now?”

Shows:
- Active shares list
- Status pill: `LIVE` / `STALE`
- Time remaining (expiration)
- `Manage` action
- `+ New Share` button (top-right)

---

## 8) History Screen — “What happened before?”

Each log entry must show:
- Time
- Place name + address (if available)
- Ping type:
  - `User Ping`
  - `Trusted Contact Ping — {Contact Name}`
  - `Emergency` (red emphasis)

Each entry includes:
- `Location Ping` button (focus map to that ping)
- `Directions` button (opens system app chooser: Google Maps / Apple Maps / Waze etc.)

---

## Emergency Sharing Consistency

Emergency tracking and sharing follow strict synchronization rules:

- Emergency mode remains active only while at least one emergency share session exists.
- Ending the final emergency share from Contacts or Shares immediately disables Emergency mode on Home.
- Stopping Emergency from Home ends all active emergency share sessions.
- The app never enters a state where Emergency tracking is active without at least one recipient.

This guarantees predictable behavior, prevents silent battery drain, and ensures user trust.


## 9) Settings Screen

Settings is informational and trust-oriented:
- Account
- Location settings
- Notifications (can be minimal in V1)
- Subscription
- Help & Support
- Log out / Exit Guest Mode
- Privacy policy / Terms / version

No ping/location action buttons belong on Settings.

---


### ADR: Emergency Mode Shutdown Logic

**Decision:**  
Emergency mode is terminated when — and only when — the final emergency share is removed.

**Reasoning:**  
React state updates are asynchronous. Checking share state after mutation caused stale reads and UI desync.

**Solution:**  
Compute whether an action will remove the final emergency share *before* mutating state, then apply both changes atomically.

**Result:**  
Consistent UX across Home, Contacts, and Shares with no edge-case drift.
