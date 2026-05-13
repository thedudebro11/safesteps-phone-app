# Agent: Backend

**Role:** Harden the Express API for production. Add Zod validation, migrate shares to the DB, implement token hashing, add persistent rate limiting, lock down CORS.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — project rules + known stubs
2. `docs/agents/STATUS.md` — confirm Phase 1 (Database) is complete before touching share session migration
3. `docs/api/API_SPEC.md` — every endpoint you're responsible for
4. `docs/db/DB_SCHEMA.md` — tables you'll be writing to
5. `docs/SECURITY_NOTES.md` — security requirements
6. `docs/ENGINEERING_INVARIANTS.md` — invariants you must not break
7. Read the actual source: `server/index.js`, `server/routes/` (all files), `server/middleware/requireUser.js`

---

## Step 2: Understand Current State

**What already works well:**
- All routes validated with `requireUser` middleware (JWT validation)
- Emergency deduplication (90s window)
- Basic in-memory rate limiting on guest share path
- Push notification delivery via Expo Push API

**What needs to be built:**

### 2.1 Zod is not yet installed or used
Every route currently does manual `String(req.body?.field ?? "")` checks. These need to be replaced with Zod schema validation.

### 2.2 Share sessions are in-memory
`sharesByToken` Map in `server/index.js` resets on every server restart. Must be migrated to `share_sessions` DB table.

### 2.3 Token hashing not implemented
Share tokens are currently stored and compared as raw strings. Must hash with SHA-256.

### 2.4 Rate limiting is in-memory
`lastPingByKey` Map resets on restart. Needs a persistent store.

### 2.5 CORS is fully open
`app.use(cors())` — no allowlist. Must restrict to production domains in production.

---

## Step 3: Your Tasks

### 3.1 Install Zod

```bash
cd server && npm install zod
```

Add a shared validation middleware pattern. Example for route validation:

```js
const { z } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request",
        issues: result.error.issues.map(i => ({ path: i.path.join("."), message: i.message }))
      });
    }
    req.body = result.data;
    next();
  };
}
module.exports = { validate };
```

**Add Zod schemas for every route body:**

| Route | Required fields | Types |
|---|---|---|
| `POST /api/locations` | lat, lng | numbers; accuracyM optional number |
| `POST /api/emergency` | lat, lng | numbers; accuracyM optional number |
| `POST /api/trust/request` | targetUserId | non-empty string |
| `POST /api/trust/requests/:id/accept` | — | (params only) |
| `POST /api/trust/requests/:id/deny` | — | (params only) |
| `POST /api/visibility/set` | viewerUserId, canView | string, boolean |
| `POST /api/users/lookup` | email | valid email string |
| `POST /api/push/register` | expoToken, platform | string starts with ExponentPushToken[, enum ios/android |
| `POST /api/shares/start` | token, reason | string, enum manual/emergency |
| `POST /api/shares/end` | token | string |

### 3.2 Migrate Share Sessions to DB

Replace the in-memory `sharesByToken` Map with queries to `share_sessions` + `share_recipients`.

**`POST /api/shares/start`** — insert into `share_sessions`:
```js
await supabaseAdmin.from("share_sessions").insert({
  user_id: userId,   // from Bearer token if authenticated, or null for guest
  status: "active",
  reason: reason,
  started_at: new Date().toISOString(),
});
```

**`POST /api/shares/end`** — update `share_sessions`:
```js
await supabaseAdmin
  .from("share_sessions")
  .update({ status: "ended", ended_at: new Date().toISOString() })
  .eq("id", sessionId);
```

**`GET /api/shares/active`** (new endpoint) — list caller's active sessions:
```js
await supabaseAdmin
  .from("share_sessions")
  .select("*, share_recipients(*)")
  .eq("user_id", userId)
  .eq("status", "active")
  .order("created_at", { ascending: false });
```

**`GET /api/shares/:token/status`** (new endpoint for share viewer) — look up share by token hash:
```js
const hash = sha256(rawToken);
const { data } = await supabaseAdmin
  .from("share_recipients")
  .select("status, share_sessions(status, expires_at, user_id)")
  .eq("token_hash", hash)
  .maybeSingle();
```

### 3.3 Implement SHA-256 Token Hashing

```js
const crypto = require("crypto");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
```

When a share is created:
- Generate a high-entropy raw token: `crypto.randomBytes(32).toString("hex")`
- Store only `sha256(token)` in `share_recipients.token_hash`
- Return the raw token to the client (never stored again)

When validating a viewer token:
- Hash the incoming token: `sha256(rawToken)`
- Compare to `share_recipients.token_hash`

### 3.4 Add Rate Limiting to Authenticated Endpoints

The in-memory `rateLimitByKey()` already exists. Extend it to cover:
- `POST /api/locations` — max 1 ping per 10s per user
- `POST /api/emergency` — max 1 ping per 5s per user
- `POST /api/emergency/alert` — max 1 alert per 90s per user (dedup table already handles this)

For persistent rate limiting, use a simple Supabase query pattern if Redis is not available:

```js
// Check last ping time in live_presence updated_at
// If updated_at within last N seconds, rate limit
```

Or add a `rate_limit_events` table keyed by `(user_id, action, window_start)`.

### 3.5 Add Profile Update Endpoint

```js
// POST /api/users/profile { displayName }
usersRouter.post("/profile", requireUser, validate(profileSchema), async (req, res) => {
  const { displayName } = req.body;
  await supabaseAdmin
    .from("profiles")
    .update({ display_name: displayName })
    .eq("user_id", req.userId);
  return res.json({ ok: true });
});
```

### 3.6 Harden CORS

```js
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:8081", "http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
```

Set `ALLOWED_ORIGINS` in Railway environment variables for production.

### 3.7 Clean Up Debug Logging

Remove or gate all `console.log` behind `process.env.NODE_ENV !== "production"`. Never log:
- JWT tokens
- Raw share tokens
- User location data

---

## Step 4: Update Docs When Done

1. `docs/api/API_SPEC.md` — add new endpoints (`/api/shares/active`, `/api/shares/:token/status`, `/api/users/profile`), update share session endpoints to reflect DB-backed behavior
2. `docs/db/DB_SCHEMA.md` — add note that `share_sessions` is now used by the backend
3. `docs/SECURITY_NOTES.md` — update hardening status (Zod ✅, token hashing ✅, CORS ✅)
4. `docs/CHANGELOG.md` — add entries
5. `docs/agents/STATUS.md` — mark Phase 2 tasks complete

---

## Definition of Done

- All routes have Zod validation
- Share sessions stored in DB (in-memory Map removed)
- Token hashing implemented (SHA-256)
- CORS locked to allowlist
- No raw tokens stored or logged
- Rate limiting covers location + emergency endpoints
- All new endpoints documented in API_SPEC.md
- STATUS.md Phase 2 all marked `[x]`
