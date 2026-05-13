# Agent: QA & Launch

**Role:** Verify every feature works end-to-end, run the full pre-launch checklist, confirm all security invariants hold, and sign off on store submission readiness.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — project rules + known stubs
2. `docs/agents/STATUS.md` — **all phases must be complete before this agent runs**
3. `docs/ENGINEERING_INVARIANTS.md` — invariants that must never break
4. `docs/SECURITY_NOTES.md` — security requirements to verify
5. `docs/api/API_SPEC.md` — every endpoint and expected behavior
6. `docs/AUTH_FLOW.md` — Part 1 (current) and Part 2 (guest mode) — both must be implemented
7. `docs/TIERS.md` — tier limits to verify
8. `docs/TRACKING_LOGIC.md` — tracking state machine to verify

---

## Step 2: Testing Environment

Before running any tests, verify:
- Dev server running: `npm run start:server` (port 3001)
- Expo dev client running: `npm run dev` or `npx expo start`
- Test Supabase project reachable
- Railway production API reachable at `lume-production-ca82.up.railway.app`

Create two test accounts:
- `qa-user-a@test.com` — primary test user
- `qa-user-b@test.com` — trusted contact

---

## Step 3: Functional Test Checklist

### 3.1 Authentication

- [ ] Register with email/password → lands on home tab
- [ ] Login with correct credentials → lands on home tab
- [ ] Login with wrong password → shows inline error (not Alert)
- [ ] Logout → lands on login screen (layout redirects, no `router.replace`)
- [ ] "Continue as Guest" button exists on login screen
- [ ] Guest session starts → lands on home tab
- [ ] Guest flag persists after app restart (kill + reopen)
- [ ] Signing in as real user from guest mode → guest mode cleared
- [ ] "Exit Guest Mode" in settings → returns to login screen
- [ ] `onAuthStateChange` SIGNED_OUT event does NOT clear guest mode while in guest mode

### 3.2 Location & Tracking

- [ ] App requests location permission on first launch
- [ ] Current location displayed on home map
- [ ] "Start Tracking" button activates active tracking mode
- [ ] Pings sent to `/api/locations` with `mode: "active"`
- [ ] `live_presence` row updated in Supabase after each ping
- [ ] "Stop Tracking" button returns to idle
- [ ] Tracking interval respects tier (guest: 60s, free: 30s, premium: 15s) — check `tiers.ts`
- [ ] Background tracking modal appears on first background permission request
- [ ] Background pings continue after app is backgrounded (native device only)
- [ ] `location_history` rows inserted for each ping

### 3.3 Emergency Mode

- [ ] "Emergency" button not shown for guest users
- [ ] Tapping "Emergency" opens `EmergencyRecipientsModal`
- [ ] Emergency mode starts tracking with `mode: "emergency"` and 15s interval
- [ ] Emergency ping sent to `/api/emergency` (not `/api/locations`)
- [ ] Push notification sent to emergency recipients
- [ ] Emergency deduplication: second trigger within 90s is a no-op (no duplicate alert)
- [ ] `emergency_alerts` row inserted in DB
- [ ] "Stop Tracking" ends emergency mode and returns to idle
- [ ] Boot reconciliation: if app was in emergency tracking at shutdown, stale share is cleared on restart

### 3.4 Contacts

- [ ] Add contact by email flow:
  - [ ] Enter email → `POST /api/users/lookup` → finds user
  - [ ] Confirm → `POST /api/trust/request` → pending request created
  - [ ] `trusted_contacts` row inserted with `status: "pending"`
- [ ] Incoming trust requests visible for target user
- [ ] Accept request → `POST /api/trust/requests/:id/accept` → status becomes "accepted"
- [ ] Deny request → `POST /api/trust/requests/:id/deny` → row updated
- [ ] Accepted contacts appear in contacts list
- [ ] Guest tier: 1 contact max — inline banner shown at limit (not Alert)
- [ ] Free tier: 3 contact max — inline banner shown at limit
- [ ] Premium tier: 10 contact max
- [ ] "No trusted contacts yet." empty state shown when list is empty

### 3.5 Location Sharing (Visibility)

- [ ] Visibility toggle enables sharing with a contact
- [ ] `POST /api/visibility/set { viewerUserId, canView: true }` called
- [ ] `live_visibility` row upserted in DB
- [ ] When tracking active + visibility enabled: contact can see location via `/api/live/visible`
- [ ] When tracking stopped: contact no longer sees location (no `live_presence` row or expired)
- [ ] Share toggle disabled when tracking is idle — tooltip shown

### 3.6 Share Sessions

- [ ] Share session created → `POST /api/shares/start`
- [ ] Session stored in DB (`share_sessions` table), not only in-memory
- [ ] Share session persists across server restart
- [ ] End share → `POST /api/shares/end`
- [ ] Active shares visible in Shares tab
- [ ] Guest tier: 1 active share max
- [ ] Free tier: 3 active shares max
- [ ] Premium tier: unlimited

### 3.7 History

- [ ] History screen shows newest-first ping list
- [ ] "Today" filter shows only today's pings
- [ ] "7 days" / "30 days" filters work
- [ ] Mode filter: All / Active / Emergency
- [ ] "Show on Map" button shows alert with coordinates (V1)
- [ ] "Directions" opens OS map app
- [ ] Guest: "History is local only" banner shown
- [ ] Free: history older than 24 hours not shown (enforced by backend `/api/history`)
- [ ] Premium: 30 days of history shown
- [ ] Empty state: "No history yet." shown
- [ ] Pull-to-refresh works

### 3.8 Membership Screen

- [ ] Tier comparison table visible (Guest / Free / Premium columns)
- [ ] Current plan highlighted correctly
- [ ] "Get Premium" CTA button visible
- [ ] Restore Purchases link visible
- [ ] Premium tier prices displayed
- [ ] If IAP not wired: "Coming soon" shown gracefully, no crash

### 3.9 Settings Screen

- [ ] Display name shown
- [ ] Email shown (read-only)
- [ ] "Edit Display Name" → inline input → saves to `/api/users/profile`
- [ ] Current tier shown (Guest / Free / Premium)
- [ ] "Upgrade to Premium" link shown for free users → navigates to /membership
- [ ] "Premium Active ✓" shown for premium users
- [ ] Push notifications status shown
- [ ] Privacy Policy link opens real URL
- [ ] Terms of Service link opens real URL
- [ ] App version shown
- [ ] "Log Out" for authenticated users
- [ ] "Exit Guest Mode" for guest users (not "Log Out")

---

## Step 4: Security Verification

### 4.1 Authentication Guards

- [ ] Every API endpoint returns 401 without `Authorization: Bearer <token>`
- [ ] `/api/trust/list` only returns current user's contacts (not other users')
- [ ] `/api/history` only returns current user's history
- [ ] `/api/live/visible` only returns contacts who have explicitly set `can_view: true`
- [ ] One user cannot access another user's share sessions

### 4.2 Input Validation (Zod)

- [ ] `POST /api/locations` with non-numeric lat/lng → 400 error
- [ ] `POST /api/trust/request` with empty `targetUserId` → 400 error
- [ ] `POST /api/visibility/set` with non-boolean `canView` → 400 error
- [ ] `POST /api/push/register` with malformed token → 400 error
- [ ] `POST /api/users/lookup` with invalid email → 400 error

### 4.3 Token Hashing

- [ ] Share tokens stored only as SHA-256 hash in `share_recipients.token_hash`
- [ ] Raw token never logged in server console
- [ ] Raw token never returned after initial creation

### 4.4 Rate Limiting

- [ ] Rapid-fire pings to `/api/locations` (< 10s apart) → second ping rate-limited
- [ ] Duplicate emergency alerts within 90s → deduplicated (via `emergency_alerts` table)

### 4.5 CORS

- [ ] API rejects requests from unlisted origins in production
- [ ] API accepts requests from production Expo/web origins

### 4.6 Guest Isolation

- [ ] Guest user cannot trigger emergency mode
- [ ] Guest user cannot see other users' location data
- [ ] Guest tracking data (local pings) not persisted to Supabase `location_history`

---

## Step 5: Device & Platform Testing

### 5.1 iOS (Physical Device Recommended)

- [ ] App installs from EAS build without crash
- [ ] Location permission prompt appears and is accurate
- [ ] Background tracking continues when app backgrounded
- [ ] Push notifications received when another user triggers emergency
- [ ] Map renders correctly
- [ ] All tabs navigate correctly

### 5.2 Android

- [ ] App installs from EAS build without crash
- [ ] Background location permission (separate from foreground) requested correctly
- [ ] Foreground service notification shown during background tracking
- [ ] Push notifications received
- [ ] Adaptive icon renders correctly on launcher

### 5.3 Web (expo web)

- [ ] Login/register work
- [ ] Home screen renders (may use simplified map or fallback)
- [ ] History and Settings screens work
- [ ] Guest mode works

---

## Step 6: Performance Verification

- [ ] Cold start (first launch) < 3 seconds to interactive
- [ ] Tab switches < 200ms
- [ ] Map renders without visible lag during tracking
- [ ] 100 history entries render without jank (FlatList virtualized)
- [ ] No memory leaks: open app, track for 5 minutes, check device memory

---

## Step 7: Regression Checklist

Run after any late changes to verify nothing broke:

| Feature | Smoke test |
|---|---|
| Auth | Login → home → logout → login again |
| Tracking | Start → wait 2 pings → verify DB row updated → stop |
| Contacts | Add contact from user-B, accept from user-A |
| Sharing | Enable visibility → confirm user-B sees user-A |
| History | Start tracking, get 3 pings, check history screen |
| Emergency | Trigger emergency, check push received by user-B |
| Guest mode | Start guest, use app, exit guest, login as real user |

---

## Step 8: App Store Preflight

### 8.1 Apple Requirements

- [ ] Privacy policy URL is live and accessible
- [ ] Terms of service URL is live and accessible
- [ ] All permission strings in `infoPlist` accurately describe usage
- [ ] Demo account credentials in App Review notes are correct
- [ ] App runs without crash on latest iOS (iOS 17+)
- [ ] No private APIs called
- [ ] No hardcoded IP addresses (all uses Railway URL from env)
- [ ] In-app purchase restore button visible (if Premium IAP submitted)
- [ ] Subscription terms shown before purchase (if IAP submitted)

### 8.2 Google Play Requirements

- [ ] Data safety form completed and accurate
- [ ] `ACCESS_BACKGROUND_LOCATION` declaration with explanation submitted
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL in Play listing
- [ ] App runs on Android 8+ (API level 26+)
- [ ] Target API level ≥ 34 (required 2024+)
- [ ] 64-bit binary (EAS handles this automatically)

---

## Step 9: Known Acceptable Gaps for V1

Document these openly in store review notes to avoid rejection:

- Premium IAP may be "Coming Soon" — this is acceptable if the subscription screen shows a clear "Coming Soon" message
- Guest mode web support may be partial
- OTA update check happens on app load (may show brief delay)

---

## Step 10: Update Docs When Done

1. `docs/agents/STATUS.md` — mark Phase 7 tasks complete
2. `docs/CHANGELOG.md` — add QA/launch entry
3. `docs/SECURITY_NOTES.md` — mark all verified items ✅

---

## Definition of Done

- All Phase 3.x functional tests pass
- All Phase 4.x security checks pass
- iOS and Android EAS builds install and run without crash
- Store review notes prepared
- No open critical bugs (P0/P1 issues)
- STATUS.md Phase 7 all marked `[x]`
