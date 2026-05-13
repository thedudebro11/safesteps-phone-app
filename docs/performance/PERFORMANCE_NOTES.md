# SafeSteps – Performance Notes



## 1. Current State (Pre-v1)

- App is relatively small; no obvious hotspots.
- No huge lists, no complex animations.
- No background tasks yet.
- Tracking will initially run only in foreground while user is on the Home screen.

Conclusion: **No heavy performance optimization required yet.** Focus is on correctness and clean architecture.

---

## 2. Core Performance Principles

1. **Track only when user explicitly wants it**
   - Avoid always-on background tracking in v1.
   - Default to “While Using the App” location permissions.
   - Respect the user’s battery and privacy.

2. **Minimize unnecessary re-renders**
   - Keep map and tracking UI components as stable as possible.
   - Use React memoization (`React.memo`, `useMemo`, `useCallback`) if re-renders become an issue.

3. **Be careful with intervals**
   - Active tracking intervals (e.g., 30s) and emergency intervals (e.g., 10s) should:
     - Run only when needed.
     - Be cleared immediately when tracking stops.
   - Avoid overlapping timers.

4. **Keep network payloads small**
   - Location ping bodies should be minimal (lat, lng, accuracy, type, source).
   - Avoid including large extra metadata per ping.

---

## 3. Early Performance Targets (v1)

- **Startup time:**  
  - App should load the main screen within a reasonable time on mid-range Android devices.
- **Tracking loop overhead:**  
  - Each ping cycle should:
    - Perform one GPS call.
    - Perform one small HTTP request.
  - No additional heavy work per cycle.
- **History screen:**
  - Pagination keeps memory usage low.
  - Initial `limit` can be 50 results per page.

---

## 4. Database-Level Performance

For `location_history`:

- Use an index on `(user_id, created_at DESC)`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_location_history_user_created
  ON public.location_history (user_id, created_at DESC);


## Scalability Analysis — 1000 Concurrent Users (2026-05-13)

### What would break first (pre-fix)

The polling architecture was the primary risk. Every user on the home screen polls
`/api/live/visible` every 5 seconds:

```
1000 active users × 1 request / 5s = 200 requests/second
Each request = 4 sequential DB queries
= ~800 DB queries/second hitting Railway → Supabase
```

Single Railway Node.js process had no horizontal scaling. In-memory rate limiting
resets on restart. No connection pooling — each request opened a fresh Postgres connection.

### Fixes applied (free, no architectural rewrite)

| Fix | How | Impact |
|---|---|---|
| **4 → 1 DB query** | `get_visible_users()` Postgres RPC function (single JOIN) | 4x reduction in DB load per poll, ~4x faster response |
| **PgBouncer** | Enabled in Supabase dashboard (Settings → Database → Connection Pooling) | Warm connection pool — eliminates 20–50ms connection setup per request, handles connection exhaustion at scale |

### Remaining scale risks (not yet addressed)

| Risk | Fix when needed | Cost |
|---|---|---|
| Polling storm at 1000+ simultaneous active users | Migrate home screen to Supabase Realtime subscriptions (server pushes, no polling) | $25/mo Supabase Pro at 500+ concurrent connections |
| Single Railway instance under spike | Railway autoscaling + Redis-backed rate limiting (Upstash free tier) | ~$0–10/mo |

### Result

These two free fixes push the realistic capacity from ~200 concurrent active users
to ~800–1000 before the next bottleneck (polling storm) appears. No code changes
visible to users.

---

## Live Visibility Performance Improvements

I optimized the live presence system to reduce latency and eliminate wasted polling.

### Before
- Polling ran continuously regardless of tracking state.
- Presence stop relied on TTL expiration.
- Overlapping fetch calls were possible.
- Boost logic could trigger redundantly.

### After
- Polling is disabled when tracking is idle.
- Presence stop deletes rows immediately.
- Overlap protection prevents request stacking.
- Boost polling runs only during critical windows.

Result:
- Faster UI responsiveness.
- Lower network usage.
- More predictable real-time behavior.

## Silent Background Refresh

Some screens display live event data such as:

- location history
- presence lists
- trusted contacts activity

To prevent UI flicker, background polling must **never trigger loading states**.

Instead, the system uses **silent refreshes**.

Example:


refetch({ silent: true })


Silent refresh rules:

1. Do not set loading indicators
2. Do not clear existing data
3. Merge or replace results in place
4. Maintain stable list keys

This allows the UI to update smoothly while new data arrives.

---

## Overlap Protection

Polling requests must never overlap.

Each polling loop uses an in-flight guard:


if (inFlightRef.current) return


This prevents request pileups and wasted network calls.

---

## Stable List Keys

All FlatList / event feed lists must use stable keys.

Example:


keyExtractor={(item) => String(item.id)}


Unstable keys cause:

- row flickering
- incorrect badge states
- excessive re-rendering