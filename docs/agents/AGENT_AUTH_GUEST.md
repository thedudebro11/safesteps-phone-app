# Agent: Auth & Guest Mode

**Role:** Implement full guest mode in the app. The spec is already written — your job is to build it exactly as specified.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — project rules + known stubs (`isGuest=false` is your primary target)
2. `docs/agents/STATUS.md` — confirm Phase 2 (Backend) is complete or at least started
3. `docs/AUTH_FLOW.md` — **the full implementation spec** — Part 1 = current code, Part 2 = what you're building
4. `docs/TIERS.md` + `docs/guest-vs-registered-vs-premium.md` — what guests can/can't do
5. Read the actual source files listed in the touch list below

---

## Step 2: Files You Will Touch (complete list)

Read every one of these before writing a single line:

| File | What to look for |
|---|---|
| `src/features/auth/AuthProvider.tsx` | Current state: no guestMode, isGuest hardcoded false |
| `app/_layout.tsx` | Current routing: `isAuthenticated` only |
| `src/features/contacts/ContactsProvider.tsx` | Line 50: `isPremium = false; // wire later` — isGuest same pattern |
| `src/features/emergency/EmergencyRecipientsModal.tsx` | Must gate emergency on !isGuest |
| `app/(auth)/login.tsx` | "Continue as Guest" button (may not exist yet — add it) |
| `app/(tabs)/settings.tsx` | "Exit Guest Mode" / "Log Out" buttons |
| `src/lib/storage.ts` | `readJson` / `writeJson` — use this for guest flag persistence |
| `src/lib/tiers.ts` | Already correctly handles isGuest — just needs real value |

---

## Step 3: Implementation

Follow `docs/AUTH_FLOW.md` Part 2 exactly. The key pieces:

### 3.1 Guest Flag Persistence

Add to `src/features/auth/AuthProvider.tsx`:

```ts
const GUEST_FLAG_KEY = "safesteps_guest";

async function readGuestFlag(): Promise<boolean> {
  try {
    const val = await readJson<boolean>(GUEST_FLAG_KEY, false);
    return val === true;
  } catch {
    return false;
  }
}

async function writeGuestFlag(on: boolean): Promise<void> {
  await writeJson(GUEST_FLAG_KEY, on).catch(() => {});
}
```

(`readJson` / `writeJson` are in `src/lib/storage.ts` — use them, don't reinvent.)

### 3.2 New AuthProvider State

```ts
const [guestMode, setGuestMode] = useState(false);
const [isHydrating, setIsHydrating] = useState(true);  // already exists

// Derived (expose these)
const isAuthenticated = Boolean(session?.user?.id);
const isGuest = guestMode && !isAuthenticated;
const hasSession = isAuthenticated || isGuest;
const isAuthLoaded = !isHydrating;
```

### 3.3 Restore Guest Flag on Startup

Inside the `loadSession()` effect, after getting the Supabase session:

```ts
const storedGuest = await readGuestFlag();
if (!nextSession && storedGuest) {
  setGuestMode(true);
}
```

### 3.4 Fix the Auth State Change Listener

**Critical:** Only clear `guestMode` when a REAL user session comes in.

```ts
supabase.auth.onAuthStateChange((_event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  // Only kill guest mode if a real authenticated user just appeared
  if (newSession?.user) {
    setGuestMode(false);
    void writeGuestFlag(false);
  }
  // Do NOT touch guestMode when newSession is null
});
```

### 3.5 New Actions

```ts
const startGuestSession = async () => {
  setIsAuthActionLoading(true);
  try {
    // Clear any stale Supabase session first
    await supabase.auth.signOut().catch(() => {});
    setSession(null);
    setUser(null);
    setGuestMode(true);
    await writeGuestFlag(true);
  } finally {
    setIsAuthActionLoading(false);
  }
};

const endGuestSession = async () => {
  setIsAuthActionLoading(true);
  try {
    setGuestMode(false);
    await writeGuestFlag(false);
    // Note: TrackingProvider must stop before this is called
    // Settings screen is responsible for calling stopAll() first
  } finally {
    setIsAuthActionLoading(false);
  }
};
```

### 3.6 Update `signOut()`

The current `signOut()` only calls `supabase.auth.signOut()`. Also clear guest mode:

```ts
const signOut = async () => {
  setIsAuthActionLoading(true);
  try {
    await supabase.auth.signOut();
    setGuestMode(false);
    await writeGuestFlag(false);
  } catch (e) {
    alert(e instanceof Error ? e.message : "Sign out failed");
  } finally {
    setIsAuthActionLoading(false);
  }
};
```

### 3.7 Update AuthProvider Context Value

```ts
const value = useMemo<AuthContextValue>(() => ({
  user,
  session,
  isAuthenticated,
  isGuest,
  hasSession,
  isAuthLoaded: !isHydrating,
  isAuthActionLoading: isAuthActionLoading || isHydrating,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  startGuestSession,
  endGuestSession,
}), [...]);
```

Update `AuthContextValue` type to include all new fields.

### 3.8 Update `_layout.tsx`

```ts
const { hasSession, isAuthLoaded, isAuthActionLoading } = useAuth();

// Show splash during hydration
if (!isAuthLoaded || isAuthActionLoading) {
  return <View style={styles.splash}><ActivityIndicator /></View>;
}

// Route on hasSession (not isAuthenticated)
if (!hasSession && !inAuthGroup) return <Redirect href="/(auth)/login" />;
if (hasSession && inAuthGroup) return <Redirect href="/(tabs)/home" />;
```

### 3.9 Wire Login Screen

Add a "Continue as Guest" button to `app/(auth)/login.tsx`:

```ts
const { startGuestSession } = useAuth();

<Pressable onPress={() => void startGuestSession()}>
  <Text>Continue as Guest</Text>
</Pressable>
```

Do NOT call `router.replace` after. The layout handles it.

### 3.10 Wire Settings Screen

For guest users, show "Exit Guest Mode" instead of "Log Out":

```ts
const { isGuest, endGuestSession, signOut } = useAuth();

const handleExit = async () => {
  // Stop tracking first
  await stopAll();  // from useTracking()
  if (isGuest) {
    await endGuestSession();
  } else {
    await signOut();
  }
  // Do NOT navigate. Layout handles the redirect.
};
```

### 3.11 Wire ContactsProvider

In `src/features/contacts/ContactsProvider.tsx`, line 50:

```ts
// BEFORE:
const isPremium = false; // wire later

// AFTER:
const { isGuest } = useAuth();
const isPremium = false; // still deferred — Premium agent handles this
```

### 3.12 Gate Emergency Mode on !isGuest

In `src/features/emergency/EmergencyRecipientsModal.tsx`:

```ts
const { isGuest } = useAuth();

if (isGuest) {
  return (
    <View>
      <Text>Emergency mode requires a free account.</Text>
      <Pressable onPress={navigateToSignUp}>Create Account</Pressable>
    </View>
  );
}
```

---

## Step 4: Guest Mode Feature Limits

Guests can do:
- View map (current location)
- Active tracking (60s min interval)
- 1 trusted contact max
- 1 active share session max

Guests CANNOT:
- Emergency mode (gate in EmergencyRecipientsModal)
- Cloud history (show local-only note in History screen)
- Multiple contacts / shares (enforced by `tiers.ts` via `isGuest`)

---

## Step 5: Update Docs When Done

1. `docs/AUTH_FLOW.md` — move Part 2 items from "Planned" to "Implemented", update Part 1 to reflect new API
2. `docs/architecture/STRUCTURE.md` — update AuthProvider description
3. `docs/CHANGELOG.md` — add guest mode entry
4. `docs/agents/STATUS.md` — mark Phase 3 tasks complete

---

## Definition of Done

- `startGuestSession()` / `endGuestSession()` work reliably on both web and native
- Guest flag survives app restart
- `onAuthStateChange` does NOT clear guest mode on SIGNED_OUT
- `_layout.tsx` routes on `hasSession`
- Guests cannot access emergency mode
- Guest tier limits enforced via `tiers.ts`
- No `router.replace` calls after auth actions in screens
- STATUS.md Phase 3 all marked `[x]`
