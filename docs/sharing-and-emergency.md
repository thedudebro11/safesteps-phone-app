## Emergency mode + Shares sync (single source of truth)

Emergency mode is tied to **active emergency shares** (`reason === "emergency"`), and the app must never allow “emergency tracking with nobody receiving”.

### Rules
- Starting Emergency requires selecting recipients in `EmergencyRecipientsModal`.
- Confirming recipients:
  1) Creates shares for each selected contact with `reason: "emergency"`
  2) Starts emergency tracking (`startEmergency()`)

### Stopping emergency must be global
If Emergency is stopped from Home:
- Stop emergency tracking
- End all active emergency shares

If the **last emergency share** is ended from Contacts or Shares:
- Emergency tracking must stop on Home immediately.

### Implementation detail (important)
Because Shares state updates async, determine whether the share you’re ending is the **last emergency share** BEFORE calling `endShare()`:

- Compute `activeEmergencyShares` first
- Determine `willStopEmergency`
- Call `endShare(...)`
- If `willStopEmergency === true`, call `stopEmergency()`

This logic is mirrored in:
- `app/(tabs)/contacts.tsx` (Stop + Remove paths)
- `app/(tabs)/shares.tsx` (End share button)
