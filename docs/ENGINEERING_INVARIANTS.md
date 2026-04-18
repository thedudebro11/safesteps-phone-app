# SafeSteps / Lume
# Engineering Invariants

This document defines the core architectural rules that must not be violated as the system evolves.

These rules ensure that new features do not introduce subtle bugs or privacy regressions.

---

# 1 Location Pings Are Append-Only

Location history is treated as an event stream.

Allowed:

• Insert new history rows  
• Query by time range  

Not allowed:

• Editing existing pings  
• Overwriting previous location records  

Why:

History represents factual events.

Mutating history can corrupt timelines.

---

# 2 Live Presence Is Ephemeral

Presence is temporary state.

It represents **who is currently sharing location**.

Presence rows must:

• expire automatically  
• be deleted immediately when tracking stops  

Presence is not a permanent record.

---

# 3 The Client Is Never Trusted

All permissions must be enforced server side.

Examples:

• trust relationships  
• visibility permissions  
• history access  

The client may request data but cannot decide what it is allowed to see.

---

# 4 Emergency Mode Has Priority

Emergency mode overrides normal tracking.

Rules:

• emergency pings are always labeled `mode = emergency`
• emergency presence overrides active tracking state
• emergency events must be clearly identifiable in history

Emergency correctness is more important than performance.

---

# 5 API Writes Must Be Retry Safe

Mobile networks are unreliable.

All write operations must be safe to retry.

Future improvement:


client_ping_id


will allow the backend to deduplicate duplicate requests.

---

# 6 Polling Must Be State Aware

Background polling should only occur when useful.

Examples:

History polling intervals:


tracking active → fast refresh
tracking idle → slow refresh


Polling should stop when the screen is not focused.

---

# 7 Background Refresh Must Be Silent

Background refresh must not disrupt the UI.

Rules:

• do not toggle loading indicators  
• do not clear the list  
• update entries in place  

Users should not perceive background refresh.

---

# 8 Stable Keys Are Mandatory

All list rendering must use stable keys.

Example:


keyExtractor={(item) => String(item.id)}


Unstable keys cause UI glitches and incorrect list updates.

---

# 9 Derived State Is Preferred

Avoid storing values that can be derived.

Examples:


current location = latest presence
history timeline = ordered pings


Derived state prevents inconsistency.

---

# 10 Privacy Comes First

SafeSteps is a privacy-first application.

Design decisions must prioritize:

• explicit consent  
• minimal retention  
• no hidden tracking  

The system must never allow silent location tracking.

---

# 11 safeRun() Guards All Async UI Actions

`safeRun` in `src/features/home/components/BottomActionDrawer.tsx` wraps every async press handler on the home screen (`onPressActive`, `onPressEmergency`, `onCancelLongPress`).

It catches thrown errors and surfaces them via `Alert.alert` instead of silently failing or crashing.

Rules:

• All async actions triggered from the home action drawer must be wrapped in `safeRun`  
• Do not bypass it with a raw `void fn()` call  
• Do not remove it in refactors without replacing the error surface  

Why:

Tracking and emergency actions fail silently on mobile networks. Without this wrapper, a rejected promise on a press handler produces no user feedback and no crash — the action just disappears.