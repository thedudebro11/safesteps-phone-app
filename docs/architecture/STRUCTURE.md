# SafeSteps – Architecture & Structure

## 1. Frontend (Expo App)

### Tech

- React Native (Expo)
- Expo Router
- TypeScript
- Supabase JS client

### Directory Structure (planned)

```txt
/mobile
  app
    _layout.tsx
    index.tsx
    (auth)/
      _layout.tsx
      login.tsx
      register.tsx
    (tabs)/
      _layout.tsx
      home.tsx
      contacts.tsx
      history.tsx
      settings.tsx

  src/
    lib/
      supabase.ts
    features/
      auth/
        AuthProvider.tsx
        useAuth.ts
      tracking/
        TrackingProvider.tsx (planned)
        useTracking.ts (planned)
      contacts/
        hooks.ts (planned)
      history/
        hooks.ts (planned)
