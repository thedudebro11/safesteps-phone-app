ocal-First Contacts + Shares (V1)

## Why local-first
- Fast UX, works offline, guest-safe by default.
- Keeps PII local (phone/email not sent anywhere).
- Backend can be added later by swapping provider internals (repo pattern).

## Key rule
Screens call **domain actions**, not storage/network APIs:

- `addContact()`
- `removeContact()`
- `createShareForContact()`
- `endShare()`

That’s what makes the backend upgrade painless.

## Storage behavior
- Web: localStorage
- Native: AsyncStorage (if installed)
- Fallback: in-memory

## Web compatibility
React Native’s `Alert.alert()` can be unreliable on web depending on runtime.
We use `confirm()` helper:
- Web: `window.confirm`
- Native: `Alert.alert` wrapped in a Promise

## Upgrade path to backend (planned)
Later we can replace local read/write with Supabase while keeping UI unchanged:
- `trusted_contacts`
- `share_sessions`
- `share_tokens` (hashed tokens, revocable)
- `location_pings` (later)

Providers remain stable; only persistence changes.