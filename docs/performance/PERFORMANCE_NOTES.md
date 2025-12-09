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

For `location_pings`:

- Use an index on `(user_id, created_at DESC)`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_location_pings_user_created
  ON public.location_pings (user_id, created_at DESC);
