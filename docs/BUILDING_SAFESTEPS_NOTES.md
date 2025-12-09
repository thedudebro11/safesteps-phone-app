# SafeSteps — Issue Log & Developer Journal

This file documents **every problem, debugging session, root cause analysis, and solution** encountered while building SafeSteps.

It serves as:
- A long-term memory for the engineering team  
- A pattern library for how bugs tend to occur  
- A reference for future developers (or AI assistants)  
- A way to rapidly re-solve issues you already solved once  
- A historical record of how the app evolved  

Maintain this as carefully as code.

---

# 🔧 Template for Each Entry

Use this structure for every issue:

```

## YYYY-MM-DD — Short Title of the Issue

### Problem

Describe what was happening. What was broken, confusing, or unexpected?

### Context

Where in the project did it occur?
Which files, screens, or features were involved?

### Root Cause

What was the actual underlying reason the issue happened?

### Solution

Detailed steps you took to fix it. Include code snippets if needed.

### Why This Happened

Explain the deeper lesson — misunderstanding, race condition, missing dependency, incorrect assumption, etc.

### How to Prevent This in the Future

What rule, pattern, or check should exist going forward?

````

This keeps entries consistent and readable for future you (and future devs).

---

# 📝 Initial Recorded Issues

Here are the entries we already solved together, documented properly.

---

## 2025-02-09 — Logout Button Not Responding on Settings Screen

### Problem
Pressing the “Log Out” button inside `Settings` did nothing.  
No error messages, and no logout behavior triggered.

### Context
- File: `app/(tabs)/settings.tsx`  
- React Native `Pressable` component  
- Using `useAuth()` for `signOut`  

### Root Cause
The `onPress` handler was attached to the wrong UI element, so the Pressable never received the event.

### Solution
1. Temporarily added a console.log inside onPress to confirm the handler wasn’t firing.
2. Moved the `onPress` property directly into the `Pressable` parent component.
3. Added a confirmation dialog (`Alert.alert`) and called `signOut()` inside the destructive action.

Working handler:

```tsx
<Pressable
  style={styles.logoutButton}
  onPress={handleLogout}
>
````

### Why This Happened

React Native sometimes ignores nested pressables or misordered touch targets.
Attaching the handler only to a child element prevented the press event from propagating properly.

### How to Prevent This in the Future

* Always test button handlers with `console.log("pressed")` BEFORE wiring complex logic.
* Keep tap targets simple and ensure `Pressable` wraps all UI needing interaction.

---

## 2025-02-09 — CORS Error When Logging Into Supabase (Web)

### Problem

Login attempts on web (`platform=web`) threw:

```
Access to fetch at 'https://<supabase-url>/auth/v1/token' from origin 'http://localhost:8081' has been blocked by CORS.
```

### Context

* Login flow inside `(auth)/login.tsx`
* Testing inside Expo web environment
* Supabase project CORS settings not configured

### Root Cause

The Supabase project did not whitelist the web development origin (`http://localhost:8081`), causing all auth requests to be rejected.

### Solution

1. Went to **Supabase Dashboard → Authentication → URL Configuration**
2. Added:

   * `http://localhost:8081`
   * `http://localhost:3000` (optional future)
3. Saved and redeployed policy.

### Why This Happened

Supabase blocks all origins by default unless explicitly added. Expo web uses a nonstandard port (8081), which wasn’t included.

### How to Prevent This in the Future

* Always add local dev origins early when working with Supabase Auth + mobile/web hybrid.
* Document local development URLs in `STRUCTURE.md` or `.env.example`.

---

## 2025-02-10 — Expo Router Type Errors After Adding Auth/Tabs Layouts

### Problem

TS errors like:

```
Cannot find module '@/app/(tabs)/_layout' or its corresponding type declarations.
```

### Context

* Expo Router auto-generates types by scanning the filesystem.
* We added `(auth)` and `(tabs)` groups simultaneously.
* Type generation lagged or failed.

### Root Cause

Expo Router’s type system did not refresh after moving files around and creating new folder groups.

### Solution

1. Restarted Expo server.
2. Deleted the `.expo` and `.expo/types` cache directories.
3. Relaunched with:

   ```
   npx expo start -c
   ```

### Why This Happened

Expo Router’s type generator sometimes caches stale folder structures.

### How to Prevent This in the Future

* After adding/moving multiple route files, restart Expo with `-c` to regenerate router types.
* Avoid renaming multiple folder levels at once unless necessary.

---

