# Next Up

_Last updated: 2026-05-12_

---

## Completed (V1 Shipped)

- ✅ `location_history` table + server writes from `/api/locations` + `/api/emergency`
- ✅ `GET /api/history` endpoint (from/to/mode filters, 200 limit, newest-first)
- ✅ History UI screen (`app/(tabs)/history.tsx`)
- ✅ History test script (`scripts/history-test.mjs`)
- ✅ Live visibility system (trust requests, visibility toggles, `/api/live/visible` with presence expiry)
- ✅ Emergency push notifications (`/api/emergency/alert` → Expo Push API)
- ✅ Push token registration (`/api/push/register`, `push_tokens` table)
- ✅ Background location task wiring (`src/lib/backgroundLocationTask.ts`)
- ✅ Emergency deduplication (90s window via `emergency_alerts` table)

---

## Planned

### High Priority
- **Guest mode** — see `docs/AUTH_FLOW.md` Part 2 for full implementation spec
- **DB-backed share sessions** — replace in-memory `sharesByToken` Map with `share_sessions` + `share_recipients` tables
- **isPremium wiring** — currently hardcoded false; needs subscription/entitlement check

### Medium Priority
- **Persistent rate limiting** — replace in-memory `lastPingByKey` Map with Redis or DB-backed store (resets on server restart today)
- **Zod validation** — add input schema validation for all server routes
- **Token hashing** — implement SHA-256 token hashing for share tokens (currently raw tokens)

### Later
- Supabase Realtime as an optional drop-in for live presence (only if strict permission enforcement is preserved)
- App Store assets + iOS build
- Push notification receipt polling (confirm delivery via Expo receipt API)
