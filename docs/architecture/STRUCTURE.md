# SafeSteps — Architecture & Folder Structure (V1)

_Last updated: 2026-05-12_

---

## 1. Tech Stack

- **Expo (React Native)** — mobile + web
- **Expo Router** — file-based navigation
- **TypeScript**
- **Supabase** — Auth + Postgres + RLS
- **Node/Express** — backend API (deployed on Railway)

---

## 2. Routing & Navigation

### Route groups
```
app/
  (auth)/       — unauthenticated screens
  (tabs)/       — main app (authenticated)
```

### Tabs (locked)
- `home` — map + tracking
- `contacts` — trust management
- `shares` — active share sessions
- `history` — location event log
- `membership` — tier/upgrade screen
- `settings` — account + privacy + logout

---

## 3. Folder Structure

```
app/
  _layout.tsx                     # root layout: AuthProvider + navigation guard
  (auth)/
    _layout.tsx
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx                   # bottom tab navigator
    home.tsx                      # tracking + map (native entry)
    home.web.tsx                  # web-specific home variant
    contacts.tsx                  # trust requests + visibility toggles
    shares.tsx                    # manage active share sessions
    history.tsx                   # location history feed
    membership.tsx                # tier upgrade screen
    settings.tsx                  # account + sign out

src/
  features/
    auth/
      AuthProvider.tsx            # session + auth actions (isGuest hardcoded false for now)
    contacts/
      ContactsProvider.tsx        # local contact state (server-backed via /api/trust/*)
      types.ts
    emergency/
      EmergencyRecipientsModal.tsx
    history/
      useHistory.ts
      types.ts
    home/
      MapFirstHomeScreen.native.tsx
      MapFirstHomeScreen.web.tsx
      components/
        BottomActionDrawer.tsx    # safeRun() wraps all async press handlers here
        DiscreteFrequencySlider.tsx
        HomeActionSheet.tsx
    map/
      LiveMapCard.tsx
      SharedMap.native.tsx
      SharedMap.tsx
      SharedMap.web.tsx
      types.ts
    shares/
      SharesProvider.tsx          # share session lifecycle
      emergencySync.ts            # shouldStopEmergencyAfterEndingShare()
      types.ts
    tracking/
      TrackingProvider.tsx        # tracking state machine (idle/active/emergency)
      BackgroundPermissionModal.tsx
    trust/
      useTrustedContacts.ts
      types.ts
  lib/
    api.ts                        # getApiBaseUrl()
    apiClient.ts                  # apiFetch(), ApiError, sendEmergencyAlert()
    backgroundLocationTask.ts     # expo-task-manager background location
    confirm.ts                    # cross-platform confirm dialog (Alert/window.confirm)
    ids.ts                        # createId() — local ID generation
    notify.ts                     # tryLocalNotify()
    registerPushToken.ts          # Expo push token registration
    sendEmergencyAlert.ts         # POST /api/emergency/alert wrapper
    storage.ts                    # getStorage() — AsyncStorage/localStorage abstraction
    supabase.ts                   # typed Supabase client
    tiers.ts                      # getEmergencyRecipientLimit(), getTrustedContactLimit()

server/
  index.js                        # Express app, inline routes (/api/locations, /api/emergency, shares)
  middleware/
    requireUser.js                # JWT validation + req.userId
  routes/
    emergency.js                  # POST /api/emergency/alert (push notifications)
    history.js                    # GET /api/history
    live.js                       # GET /api/live/visible
    push.js                       # POST /api/push/register
    trust.js                      # POST/GET /api/trust/*
    users.js                      # /api/users/*
    visibility.js                 # POST /api/visibility/set
  lib/
    history.js                    # insertHistoryEvent()
    supabaseAdmin.js              # supabaseAdmin + supabaseAuth clients
```

---

## 4. Data Flow (High Level)

**Tracking:**  
`TrackingProvider` → `POST /api/locations` or `POST /api/emergency` → upsert `live_presence` + append `location_history`

**Live map:**  
`MapFirstHomeScreen` polls `GET /api/live/visible` → filters by trust + visibility + presence expiry

**Trust:**  
`ContactsProvider` / contacts screen → `/api/trust/*` → `trusted_contacts` table

**History:**  
History screen → `GET /api/history` → `location_history` table

**Emergency alerts:**  
Client triggers → `POST /api/emergency/alert` → resolves trusted contacts → sends via Expo Push API

---

## 5. Key Design Decisions

- **No Supabase direct client writes from the app for trust/visibility/history.** Everything goes through the Express API so permission enforcement stays server-side.
- **Feature providers vs. local-first vs. server-backed:** Contacts and shares providers manage local state and sync to the server. This keeps the UI decoupled from network state.
- **`safeRun()`** in `BottomActionDrawer.tsx` wraps all async press handlers to prevent silent failures on mobile networks. See `ENGINEERING_INVARIANTS.md #11`.
- **Platform variants:** `.native.tsx` / `.web.tsx` suffixes are used for map components and home screen where native and web behavior diverge.
