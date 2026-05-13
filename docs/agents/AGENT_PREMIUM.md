# Agent: Premium

**Role:** Build the membership/subscription system. Wire `isPremium` from a real subscription check, implement the full membership screen, and enforce tier limits app-wide.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — `isPremium=false` is your primary target (hardcoded in `ContactsProvider.tsx:50`)
2. `docs/agents/STATUS.md` — confirm Phase 4 (Frontend) is complete
3. `docs/TIERS.md` — tier definitions and limits
4. `docs/guest-vs-registered-vs-premium.md` — feature gating details
5. `src/lib/tiers.ts` — already correct, just needs real `isPremium` input
6. `app/(tabs)/membership.tsx` — currently a placeholder
7. `src/features/contacts/ContactsProvider.tsx` — where `isPremium = false` lives

---

## Step 2: Subscription Strategy

### Recommended: RevenueCat

RevenueCat is the standard Expo/RN subscription solution. It handles:
- In-app purchases (iOS App Store + Google Play)
- Receipt validation
- Subscription status management
- Restore purchases

Install:
```bash
npx expo install react-native-purchases
```

Or use Expo IAP (`expo-in-app-purchases`) if RevenueCat is too heavy for V1.

**Minimum viable approach for store submission:**
If subscription infrastructure isn't ready, the Membership screen can show pricing + "Coming Soon" while the app ships with `isPremium = false`. Do NOT block App Store approval on this. Mark clearly in STATUS.md.

---

## Step 3: Your Tasks

### 3.1 Create `PremiumProvider`

Create `src/features/premium/PremiumProvider.tsx`:

```tsx
type PremiumContextValue = {
  isPremium: boolean;
  isLoadingSubscription: boolean;
  restorePurchases: () => Promise<void>;
  purchasePremium: () => Promise<void>;
};
```

On mount, check subscription status:
- If using RevenueCat: `Purchases.getCustomerInfo()` → check entitlements
- If not yet integrated: `isPremium = false` (stub, clearly documented)

Expose via `usePremium()` hook.

Add `<PremiumProvider>` to `app/_layout.tsx` (inside `<AuthProvider>`, outside `<ContactsProvider>`):

```tsx
<AuthProvider>
  <PremiumProvider>
    <ContactsProvider>
      ...
```

### 3.2 Wire `isPremium` in `ContactsProvider`

Current code at line 50:
```ts
const isPremium = false; // wire later
```

Replace with:
```ts
const { isPremium } = usePremium();
```

### 3.3 Wire `isPremium` Everywhere Tiers Are Checked

Search for all `getEmergencyRecipientLimit` and `getTrustedContactLimit` calls and make sure they receive the real `isPremium` value:

```bash
grep -rn "isPremium\|getEmergencyRecipientLimit\|getTrustedContactLimit" src/
```

Fix each one to use `usePremium().isPremium`.

### 3.4 Build Membership Screen (`app/(tabs)/membership.tsx`)

Full screen layout:

```
[Header: "Lume Premium"]
[Subheader: "Protect the people you love"]

[Current Plan Badge: Guest / Free / Premium]

[Tier Comparison Table]
| Feature              | Guest | Free | Premium |
|---------------------|-------|------|---------|
| Trusted Contacts    |   1   |   3  |   10    |
| Emergency Recipients|   1   |   3  |   10    |
| Emergency Mode      |   ✗   |   ✓  |    ✓    |
| History Duration    | Local | 24h  |  30 days|
| Tracking Interval   |  60s  | 30s  |   15s   |
| Share Sessions      |   1   |   3  |  Unlimited|

[CTA: "Get Premium — $X/month"]
  (calls purchasePremium())

[Restore Purchases link]

[Fine print: "Cancel anytime. Billed monthly."]
```

Design rules: dark background (`#050814`), accent blue for CTA, premium column highlighted with subtle glow border.

### 3.5 Pricing Configuration

Define pricing in a config file, not hardcoded in the screen:

```ts
// src/features/premium/pricing.ts
export const PREMIUM_PRODUCT_ID_IOS = "com.lume.premium.monthly";
export const PREMIUM_PRODUCT_ID_ANDROID = "com.lume.premium.monthly";
export const PREMIUM_DISPLAY_PRICE = "$4.99/month"; // fallback until store price loads
```

### 3.6 Restore Purchases

Both App Store and Google Play **require** a "Restore Purchases" button for subscriptions:

```tsx
<Pressable onPress={() => void restorePurchases()}>
  <Text style={{ color: Colors.muted }}>Restore Purchases</Text>
</Pressable>
```

### 3.7 Premium Status in Settings

Update `app/(tabs)/settings.tsx` subscription section:
- Show current tier (Guest / Free / Premium)
- If free: "Upgrade to Premium" link → `/membership`
- If premium: "Premium Active ✓" with manage subscription link

---

## Step 4: App Store Requirements for Subscriptions

Both stores require:
- Privacy policy URL — **required** (Build agent handles this)
- Terms of service URL — **required**
- Subscription terms clearly displayed before purchase
- "Cancel anytime" wording near the subscribe button
- Price displayed clearly (pull from store, not hardcoded)
- Restore purchases button visible

---

## Step 5: Update Docs When Done

1. `docs/TIERS.md` — mark isPremium as wired (not hardcoded)
2. `docs/architecture/STRUCTURE.md` — add `PremiumProvider` to the structure
3. `docs/CHANGELOG.md` — add premium/membership entry
4. `docs/agents/STATUS.md` — mark Phase 5 tasks complete

---

## Definition of Done

- `isPremium` reads from real subscription status (or clearly documented stub if IAP not ready)
- `PremiumProvider` exists and is in the provider tree
- Membership screen shows tier comparison + CTA + restore purchases
- `getTrustedContactLimit` and `getEmergencyRecipientLimit` receive real `isPremium`
- Settings screen shows current tier
- Restore purchases works on both platforms
- STATUS.md Phase 5 all marked `[x]`
