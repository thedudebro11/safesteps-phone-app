# Agent: Build & Store

**Role:** Configure EAS builds, finalize `app.config.js` for production, create all required store assets, and submit to App Store Connect and Google Play Console.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — project rules
2. `docs/agents/STATUS.md` — confirm Phase 5 (Premium) is complete before submitting
3. `docs/TIERS.md` — for store listing feature descriptions
4. `docs/architecture/STRUCTURE.md` — understand app entry points and config files
5. Read actual config files: `app.config.js`, `app/(tabs)/_layout.tsx`, `app/_layout.tsx`

---

## Step 2: Current Build State

What already exists:
- `app.config.js` — dynamic config, minimal setup (Google Maps API key)
- `babel.config.js` — standard Expo setup
- `expo-updates` — installed for OTA (over-the-air) updates
- Railway server — already deployed at `lume-production-ca82.up.railway.app`

What needs to be built:
- `eas.json` — EAS build profiles
- Production `app.config.js` values (bundle ID, version, build number, permissions)
- App icons (all required sizes)
- Splash screen
- Privacy policy + Terms of Service hosted pages
- Store listing copy

---

## Step 3: Your Tasks

### 3.1 Complete `app.config.js`

Read current `app.config.js` first — it already has the dynamic config skeleton. Add:

```js
// app.config.js
export default ({ config }) => ({
  ...config,
  name: "Lume",
  slug: "lume",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#050814",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.lume.app",
    buildNumber: "1",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Lume uses your location to share it with trusted contacts during active tracking sessions.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Lume uses your location in the background so trusted contacts can see your location even when the app is closed.",
      NSLocationAlwaysUsageDescription:
        "Lume uses your background location to keep trusted contacts updated during active tracking.",
      UIBackgroundModes: ["location", "fetch"],
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#050814",
    },
    package: "com.lume.app",
    versionCode: 1,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "RECEIVE_BOOT_COMPLETED",
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow Lume to use your location for sharing with trusted contacts.",
        locationAlwaysPermission:
          "Allow Lume to use your location in the background for continuous safety tracking.",
        locationWhenInUsePermission:
          "Allow Lume to use your location for sharing with trusted contacts.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#3896ff",
        sounds: [],
      },
    ],
    "expo-updates",
  ],
  updates: {
    url: "https://u.expo.dev/<your-project-id>",
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "<your-eas-project-id>",
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  },
});
```

**Action required:** Replace `<your-project-id>` and `<your-eas-project-id>` with real values from `eas init`.

### 3.2 Create `eas.json`

`eas.json` is gitignored (see `.gitignore`). Create it locally and add to EAS dashboard:

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:3001"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://lume-production-ca82.up.railway.app"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://lume-production-ca82.up.railway.app"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

Secrets (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY`) go in EAS dashboard → project → secrets (already set from previous work).

### 3.3 App Icons

**iOS App Store icon:**
- File: `assets/icon.png`
- Size: **1024×1024px**
- Format: PNG, NO transparency (App Store rejects transparency)
- No rounded corners (iOS applies them automatically)
- Background: `#050814` (dark navy, same as app background)
- Design: Lume wordmark or shield/location pin graphic on dark background

**Android Adaptive Icon:**
- Foreground file: `assets/adaptive-icon.png`
- Size: 1024×1024px, transparent background, icon centered in 66% safe zone
- `backgroundColor` in app.config: `"#050814"`

**Notification icon (Android):**
- File: `assets/notification-icon.png`
- White silhouette on transparent background
- Size: 96×96px minimum

**Favicon (web):**
- File: `assets/favicon.png`
- Size: 48×48px

### 3.4 Splash Screen

- File: `assets/splash.png`
- Size: 1284×2778px (covers all modern iPhone sizes at 3x)
- Background fill: `#050814`
- Centered logo/wordmark only
- `resizeMode: "contain"` in config

### 3.5 Initialize EAS Project

Run once to link the project:

```bash
npx eas init
```

This creates/updates `app.config.js` `extra.eas.projectId`. Commit the updated `app.config.js` (not `eas.json`).

### 3.6 Privacy Policy & Terms of Service

Both App Store and Google Play **require** a hosted privacy policy URL. Options:

**Option A — Notion (free, fast):**
- Create a public Notion page
- Host at: `https://notion.so/lume/privacy-policy`

**Option B — GitHub Pages (permanent, professional):**
- Create `docs/legal/privacy-policy.md` and `docs/legal/terms.md`
- Enable GitHub Pages on the repo

**Required privacy policy content:**
- What data is collected (location, email, contacts)
- How it's used (sharing with trusted contacts only)
- Where it's stored (Supabase, US/EU region)
- How to delete your data (contact email or in-app)
- No third-party advertising
- Push notification data usage

Add privacy policy and ToS links to:
1. `app/(tabs)/settings.tsx` — already in the Settings agent spec
2. App Store Connect listing
3. Google Play listing
4. App Store "More Information" section

### 3.7 Build Commands

**iOS build (requires macOS or EAS cloud build):**
```bash
npx eas build --platform ios --profile production
```

**Android build:**
```bash
npx eas build --platform android --profile production
```

**Both platforms:**
```bash
npx eas build --platform all --profile production
```

**Submit after build:**
```bash
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

### 3.8 iOS App Store Connect Setup

Steps (manual, in browser):

1. **Create App** at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Bundle ID: `com.lume.app`
   - Name: "Lume – Safety Sharing"
   - Primary language: English

2. **App Information:**
   - Subtitle: "Share your location safely"
   - Category: Navigation (primary), Health & Fitness (secondary)
   - Content Rights: Does not contain third-party content

3. **Pricing:** Free (with in-app purchases for Premium tier)

4. **In-App Purchases (if Premium is ready):**
   - Product ID: `com.lume.premium.monthly`
   - Type: Auto-Renewable Subscription
   - Subscription Group: "Lume Premium"
   - Duration: 1 month
   - Price: $4.99/month
   - Localized description: "Unlimited trusted contacts, 30-day history, and 15-second tracking updates."

5. **App Review Information:**
   - Demo account required: Yes — create a test account in Supabase
   - Notes: "This app requires location permissions to function. Please test with two devices or accounts to verify contact sharing."

6. **App Privacy:**
   - Location: Precise, Always, Used to track + share with trusted contacts
   - Contact info: Email address, Collected, Linked to identity
   - Identifiers: User ID (anonymous per Supabase UUID), Linked to identity

### 3.9 Google Play Console Setup

Steps (manual):

1. **Create app** at [play.google.com/console](https://play.google.com/console)
   - Package: `com.lume.app`
   - Type: App
   - Free or paid: Free

2. **Store listing:**
   - App name: "Lume – Safety Sharing"
   - Short description (80 chars): "Share your live location with trusted contacts. Safety made simple."
   - Full description (4000 chars): Use the feature list from TIERS.md

3. **Content rating:** Everyone (no mature content)

4. **Data safety form:**
   - Location: Precise, Approximate (optional) — shared with other users at user's request
   - Personal info: Email address — required for account
   - App activity: App interactions — not shared, not sold

5. **Permission declarations:**
   - `ACCESS_BACKGROUND_LOCATION` — required, explain: "Background location is required to continue sharing your location with trusted contacts when the app is minimized."

### 3.10 Store Listing Copy

**App description (use for both stores):**

```
Lume is a privacy-first safety sharing app. Share your live location with trusted contacts when you need someone watching your back.

FEATURES
• Real-time GPS sharing with trusted contacts
• Emergency mode — instantly alerts contacts with your location
• Location history — review where you've been
• Background tracking — keeps running even when your phone is in your pocket
• Granular control — you decide who sees you and when

HOW IT WORKS
1. Add trusted contacts by email
2. Start a tracking session
3. Your contacts see your live location on their map
4. Stop sharing anytime — you're always in control

PRIVACY FIRST
Your location is never shared without your explicit permission. No advertising. No data selling. Your location data is yours.

TIERS
• Guest: Try the app without an account
• Free: 3 trusted contacts, 24-hour history
• Premium: 10 contacts, 30-day history, 15-second updates
```

**Short description:**
`Share your live location with trusted contacts. Emergency alerts. Always in control.`

### 3.11 Screenshots

Required screenshot sizes:

**iOS:**
- 6.9" iPhone (iPhone 16 Pro Max): 1320×2868px — required
- 6.5" iPhone (iPhone 14 Plus): 1242×2688px — required
- 12.9" iPad Pro: 2048×2732px — required if supporting iPad

**Android:**
- Phone: 1080×1920px minimum
- 7" tablet (optional but recommended)
- 10" tablet (optional)

**Minimum 3 screenshots per device type. Recommended 5-8.**

Screenshot scenes:
1. Home screen with active tracking (map visible)
2. Contacts screen with a trusted contact shown
3. Shares screen with an active live share
4. History screen with ping entries
5. Membership screen showing tier comparison

### 3.12 OTA Updates (expo-updates)

`expo-updates` is already installed. For production OTA:

```bash
npx eas update --branch production --message "fix: description of change"
```

OTA updates work for JS/asset changes only. Native code changes require a full store build.

---

## Step 4: Environment Variables Checklist

Verify these are set in EAS dashboard before building:

| Variable | Where set | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | EAS secrets | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | EAS secrets | Supabase anon key |
| `EXPO_PUBLIC_API_URL` | `eas.json` env | Railway API URL |
| `GOOGLE_MAPS_API_KEY` | EAS secrets | Google Maps (Android + iOS) |

Also verify Railway production env vars:
| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret) |
| `PORT` | 3001 (or Railway default) |
| `ALLOWED_ORIGINS` | Set by Backend agent |

---

## Step 5: Update Docs When Done

1. `docs/agents/STATUS.md` — mark Phase 6 tasks complete
2. `docs/CHANGELOG.md` — add build/store entry
3. `app.config.js` — real EAS project ID committed
4. Update `CLAUDE.md` if bundle IDs or EAS project ID changes

---

## Definition of Done

- `app.config.js` has real bundle IDs, version, all permission strings
- `eas.json` created with development/preview/production profiles
- App icon 1024×1024 (no transparency) in `assets/icon.png`
- Android adaptive icon in `assets/adaptive-icon.png`
- Splash screen in `assets/splash.png`
- Privacy policy hosted at a real URL
- Privacy policy URL added to Settings screen
- App Store Connect app created and configured
- Google Play Console app created and configured
- At least one successful EAS build (iOS + Android)
- Store listings have description + screenshots
- STATUS.md Phase 6 all marked `[x]`
