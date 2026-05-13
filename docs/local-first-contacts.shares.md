# Contacts & Shares Architecture

_Last updated: 2026-05-12_

---

## Current Architecture: Server-Backed

Contacts are now server-backed via the Express trust system. The local-first approach described in early design notes was superseded before V1 shipped.

### Contacts (trusted_contacts)

Managed via `/api/trust/*`:
- `POST /api/trust/request` — send trust request by userId
- `GET /api/trust/requests/incoming` — see who requested you
- `POST /api/trust/requests/:id/accept` — accept + creates reciprocal row
- `POST /api/trust/requests/:id/deny`
- `GET /api/trust/list` — accepted contacts with visibility state

### Shares (in-memory, V1)

Share sessions are tracked in-memory on the server (`sharesByToken` Map in `server/index.js`).

Endpoints: `/api/shares/start`, `/api/shares/end`, `/api/shares/:token/block`

**Implication:** share state resets on server restart. Persisting to a DB table is a planned upgrade.

---

## Screen → Domain Action Contract

Screens call domain actions, not storage APIs directly:

- `addContact()` / `removeContact()` → `ContactsProvider`
- `createShareForContact()` / `endShare()` → `SharesProvider`

This decouples the UI from the underlying persistence layer.

---

## Web Compatibility

`Alert.alert()` can be unreliable on web. Use the `confirm()` helper (`src/lib/confirm.ts`):
- Web: `window.confirm`
- Native: `Alert.alert` wrapped in a Promise

---

## Planned: DB-Backed Share Sessions

When shares are moved from in-memory to the DB:

Tables needed:
- `share_sessions` — time-bound session (`user_id`, `status`, `expires_at`)
- `share_recipients` — per-recipient token hashes (never store raw tokens)
- `location_pings` — if per-session location history is added

Providers remain stable; only `SharesProvider` internals change.

See `docs/db/DB_SCHEMA.md` for the planned schema.
