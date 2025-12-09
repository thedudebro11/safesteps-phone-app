# SafeSteps – Design Guide

## 1. Visual Identity

**Theme:** Dark, calm, safety-focused.  
The app should feel like a **protective tool**, not a spy camera.

### Colors

- Background: `#050814`
- Card background: `#0c1020`
- Border: `#1a2035`
- Accent (primary): `#3896ff`
- Muted text: `#a6b1cc`
- Danger: `#ff4b5c`
- White text: `#ffffff`

Use accent sparingly for:

- Primary actions (e.g., “Start Tracking”)
- Links / important CTAs
- Active tab indicators

Use danger color for:

- Emergency Mode button
- Error text
- Destructive actions (delete contact)

---

## 2. Typography

Use a clean sans-serif (system default is fine for now).

Basic scale:

- Title (screen headline): 24–28 px, bold
- Section titles: 16–18 px, semi-bold
- Body text: 13–15 px, regular
- Labels: 12–13 px, medium

---

## 3. Components

### Cards

- Background: `#0c1020`
- Border: `#1a2035`, 1 px
- Radius: 16–18
- Padding: 16
- Spacing between elements: 6–10

Used for:

- Account info
- Status info (tracking state)
- Data & Safety explanations
- History items (optional)

### Buttons

Primary action (blue):

- Background: `#3896ff`
- Text: white
- Radius: 999 (pill) or 14
- Height: ~48
- Full-width on mobile where appropriate

Danger action (red, especially Emergency):

- Background: transparent or `#ff4b5c` (depending on emphasis)
- Border: `#ff4b5c`
- Text: `#ff4b5c` or white (for very prominent emergency)

Disabled:

- `opacity: 0.6`
- No change in layout

---

## 4. Layout Patterns

### Screen Layout

- `SafeAreaView` with background `#050814`
- Horizontal padding: 20
- Vertical spacing: 12–16
- Scrollable content when needed

### Home Screen

- Top:
  - Greeting: “Welcome, {email}”
- Middle:
  - Map component occupying ~50–60% of vertical space
- Bottom:
  - Tracking status card
  - “Start/Stop Tracking” button
  - “Emergency Mode” button
  - “Share my live location” button (possibly below or inside card)

---

## 5. Accessibility

- Maintain high contrast:
  - White text on dark backgrounds
  - Avoid low-contrast muted text for critical info
- Hit targets:
  - Buttons at least 44x44 points
- Clear labels on:

  - Buttons
  - Toggles
  - Emergency actions

---

## 6. Interaction Principles

- **Clarity over cleverness**:
  - When tracking is on, make it *obvious* (color + text).
- **No hidden behavior**:
  - No silent background tracking without user opt-in and clear explanation.
- **Emergency is sacred**:
  - Emergency Mode should:
    - Look serious
    - Require deliberate tap (optional confirm)
    - Provide immediate feedback (e.g., color change, text change, state badge)

---

## 7. Empty States

- Trust contacts empty state:
  - “You have no trusted contacts yet. You can still share your live location via a link.”
- History empty state:
  - “No location history yet. Start tracking to see your past routes.”
- Home when not tracking:
  - Status card: “Tracking is OFF. Your location is not being updated.”
