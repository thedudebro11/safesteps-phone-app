# Agent: Frontend

**Role:** Polish every screen to production quality. Fix design guide violations, complete unfinished UI, add error boundaries, and ensure the app looks and feels like a real product.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — project rules
2. `docs/agents/STATUS.md` — confirm Phase 3 (Auth & Guest) is complete
3. `docs/DESIGN_GUIDE.md` — **your primary reference** — every screen must match this
4. `docs/AUTH_FLOW.md` Part 1 — current auth state you can use in screens
5. `docs/TIERS.md` — what each tier can see/do
6. Read all screen files: `app/(tabs)/*.tsx`, `app/(auth)/*.tsx`
7. Read `src/features/home/`, `src/features/tracking/TrackingProvider.tsx`

---

## Step 2: Design System Reference

All screens must use these exact values:

```ts
const Colors = {
  bg:       "#050814",
  card:     "#0c1020",
  border:   "#1a2035",
  accent:   "#3896ff",
  muted:    "#a6b1cc",
  danger:   "#ff4b5c",
  text:     "#ffffff",
  live:     "#22c55e",  // green for LIVE/ACTIVE status pills
};

const Radius = { card: 16 };
const Shadow = { color: "#000", offset: { width: 0, height: 2 }, opacity: 0.3, radius: 8 };
```

Typography rules:
- Screen titles: `fontWeight: "800"`, large (24–28px)
- Card labels: `fontWeight: "700"`, 14–16px
- Body/subtext: `color: Colors.muted`, 13–14px
- Emergency elements always use `Colors.danger`
- Primary actions always use `Colors.accent`

---

## Step 3: Screen-by-Screen Tasks

### 3.1 Home Screen (`app/(tabs)/home.tsx` + `MapFirstHomeScreen.native.tsx`)

Verify these are present and correct:
- [ ] Map as base layer (full-screen)
- [ ] Bottom action drawer collapsed by default, free-drag
- [ ] Signal state badge: **Active** (blue) / **Spotty** (amber) / **Dead** (red)
- [ ] Current lat/lng displayed (6 decimal places)
- [ ] Accuracy in meters displayed
- [ ] Last update timestamp displayed (relative: "2s ago")
- [ ] "Start Tracking" button — blue, launches active tracking
- [ ] "Stop Tracking" button — shown when active/emergency
- [ ] "Emergency" button — red, only shown for authenticated users (not guests)
- [ ] "Share Live Location" — navigates to Contacts tab
- [ ] Background tracking badge — shown when `isBackgroundTracking=true`
- [ ] Error state: `lastError` displayed as non-blocking banner (never an Alert)

### 3.2 Contacts Screen (`app/(tabs)/contacts.tsx`)

- [ ] List of trusted contacts loaded from `/api/trust/list`
- [ ] Each row shows: avatar initial circle, display name or email, share toggle or "SHARING" pill
- [ ] Add contact by email flow: text input → `POST /api/users/lookup` → `POST /api/trust/request`
- [ ] Incoming trust requests section (pulls from `/api/trust/requests/incoming`)
- [ ] Accept/Deny buttons on incoming requests
- [ ] Visibility toggle (share enabled) calls `POST /api/visibility/set`
- [ ] When tracking is idle: share button disabled with tooltip "Start tracking first"
- [ ] Guest users: show "1 contact limit" inline banner when at limit (not an Alert)
- [ ] Free users: show "3 contact limit" inline banner when at limit
- [ ] Empty state: "No trusted contacts yet. Add someone by email."

### 3.3 Shares Screen (`app/(tabs)/shares.tsx`)

- [ ] List of active share sessions
- [ ] Each row: contact name, status pill (LIVE = green / STALE = amber), time remaining or "No expiry"
- [ ] "End Share" button — confirms before ending
- [ ] Empty state: "No active shares."
- [ ] `+ New Share` button → navigates to Contacts
- [ ] Emergency shares shown with red accent, labeled "Emergency Share"

### 3.4 History Screen (`app/(tabs)/history.tsx`)

- [ ] Newest-first event list
- [ ] Each entry shows: time (formatted), mode label ("Active Ping" / "Emergency Ping" in red)
- [ ] Lat/lng formatted (e.g., "40.7128°N, 74.0060°W")
- [ ] Accuracy shown (e.g., "±12m")
- [ ] "Show on Map" button → focuses map to that coordinate (alert with coords for V1)
- [ ] "Directions" button → opens OS map chooser (`Linking.openURL`)
- [ ] Date range filter: Today / 7 days / 30 days
- [ ] Mode filter: All / Active / Emergency
- [ ] Empty state: "No history yet. Start tracking to record pings."
- [ ] Guest state: "History is local only in guest mode. Create an account to sync to the cloud."
- [ ] Pull-to-refresh
- [ ] Silent auto-refresh while focused (no loading spinner during background refresh)

### 3.5 Membership Screen (`app/(tabs)/membership.tsx`)

Currently just "Coming soon." Build the full screen:

- [ ] Header: "Upgrade to Premium"
- [ ] Tier comparison table (3 columns: Guest / Free / Premium)
- [ ] Feature rows: contacts limit, shares limit, emergency recipients, history duration, tracking frequency
- [ ] "Get Premium" CTA button (wired to Premium Agent's IAP flow — or show "Coming soon" if Premium agent hasn't run yet)
- [ ] Current plan highlighted
- [ ] Restore Purchases link

### 3.6 Settings Screen (`app/(tabs)/settings.tsx`)

- [ ] Account section: display name (editable), email (read-only), avatar initial
- [ ] "Edit Display Name" → inline text input → `POST /api/users/profile`
- [ ] Location settings: tracking frequency preference (foreground/background)
- [ ] Notifications section: push notifications status (enabled/disabled with link to OS settings)
- [ ] Subscription section: current tier, link to Membership screen
- [ ] Help & Support: mailto link or external URL
- [ ] Privacy Policy link (required for App Store)
- [ ] Terms of Service link (required for App Store)
- [ ] App version display: `import { version } from "../package.json"`
- [ ] "Log Out" (authenticated) / "Exit Guest Mode" (guest) — uses `endGuestSession()` / `signOut()` from auth agent
- [ ] No `router.replace` after auth actions

### 3.7 Login Screen (`app/(auth)/login.tsx`)

- [ ] Email + password fields
- [ ] "Sign In" button
- [ ] "Create Account" link → register
- [ ] **"Continue as Guest"** button (added by Auth agent, verify it exists and works)
- [ ] Loading state while `isAuthActionLoading`
- [ ] Error display (inline, not Alert)

### 3.8 Register Screen (`app/(auth)/register.tsx`)

- [ ] Email + password fields
- [ ] Display name field (optional but encouraged)
- [ ] "Create Account" button
- [ ] Back to login link
- [ ] Loading state during registration
- [ ] Error display inline

---

## Step 4: Cross-Cutting UI Requirements

### 4.1 Error Boundaries

Wrap every tab screen in an error boundary:

```tsx
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#050814", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#a6b1cc" }}>Something went wrong. Pull to refresh.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
```

### 4.2 Stable List Keys

Every `FlatList` must have:
```tsx
keyExtractor={(item) => String(item.id)}
```

### 4.3 Guest Upgrade Prompts

Any feature that's unavailable for guests should show:
```
[🔒 Feature Name]  
Available with a free account.
[Create Account]
```
Use `Colors.muted` for the lock text, `Colors.accent` for the button.

### 4.4 Loading States

- Initial data load: full-screen `ActivityIndicator` over dark background
- Background refresh: do NOT show loading indicators (silent)
- Button presses: disable button + show inline spinner during action

---

## Step 5: Update Docs When Done

1. `docs/DESIGN_GUIDE.md` — add any new components or patterns discovered
2. `docs/CHANGELOG.md` — list completed screen improvements
3. `docs/agents/STATUS.md` — mark Phase 4 tasks complete

---

## Definition of Done

- Every screen matches `docs/DESIGN_GUIDE.md` color + layout spec
- Error boundaries on all tab screens
- No raw `Alert.alert` calls for data errors (inline UI only)
- Membership screen shows tier comparison (even if IAP not wired yet)
- Settings screen has privacy policy + terms links + app version
- All FlatLists have stable keyExtractor
- Guest upgrade prompts on locked features
- STATUS.md Phase 4 all marked `[x]`
