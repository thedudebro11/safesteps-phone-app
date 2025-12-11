# SafeSteps – Security Notes

_Last updated: 2025-12-10_

This document tracks all known security decisions, audits, verifications, and vulnerability checks performed during development of the SafeSteps mobile application.

The purpose of this file is to ensure:
- Long-term security awareness
- Clear reasoning behind all decisions
- Easy auditing for future maintainers
- Quick verification for AI coding assistants

---

# 1. Application Security Philosophy

SafeSteps is intentionally built as a **privacy-first** and **minimal-attack-surface** app.

Core principles:
- No third-party analytics SDKs
- No tracking beyond explicit user actions
- No hidden background tasks
- No advertising networks
- All backend API calls authenticated via Supabase JWT
- Guest mode remains entirely local

---

# 2. Dependency & Framework Security

## 2.1 React / Expo Security

SafeSteps uses:
- React Native (client-only)
- Expo Router
- TypeScript

**No React Server Components, no Server Actions, no SSR, no Next.js.**  
This removes entire classes of web vulnerabilities.

### CVE-2025-55182 (React Server Remote Code Execution)
**Status: Not Applicable**

Investigation:
- Found "react-server-dom-webpack" references inside package-lock.json.
- Verified it was not installed (`npm ls`, `npm why`).
- Reinstalled dependencies; reference disappeared.
- App does not use:
  - React Server
  - Flight protocol
  - Server deserialization of RSC chunks

Conclusion:  
SafeSteps is **not** affected by the CVE.

---

# 3. Supabase Authentication Security

Supabase provides:
- Password hashing (bcrypt or argon2)
- JWT-based authentication
- Row-Level Security (RLS)
- Encrypted rest endpoints

SafeSteps does:
- Always sends `Authorization: Bearer <token>`
- Never embeds service role keys in client apps
- Never exposes admin APIs

Guest mode:
- No backend access  
- No database writes  
- Local only  

---

# 4. Mobile Permissions Security

SafeSteps uses:
- `expo-location` (planned)
- User must explicitly approve permissions
- No “always-on” background tracking by default
- Tracking only activates when user toggles it on

This prevents silent location abuse.

---

# 5. Backend Security (Planned)

When backend is implemented:

- All routes will validate Supabase JWT
- `/locations` will validate:
  - lat/lng types
  - request frequency
  - permissible schema
- Rate limiting will be applied (IP + user ID)
- No open endpoints
- No service role key exposed
- Helmet, CORS, and compression middleware

---

# 6. Future Hardening TODO List

- Implement an allowlist for origins when production deploy begins
- Implement schema validation with Zod on all client → backend requests
- Add API throttle for emergency mode (prevent spam attacks)
- Add logging for suspicious request patterns
- Start a “security release cadence” every 30–60 days

---

# 7. Summary

As of this writing, SafeSteps has:

- No known vulnerabilities  
- Clean dependency tree  
- No usage of affected React Server features  
- A secure auth model (Supabase + JWT + RLS)  
- Strong privacy defaults  
- A minimal, controlled permission model  
- Local-only guest mode, reducing attack surface  

This file should be updated whenever:
- Dependencies change
- New APIs are added
- Backend launches
- A security audit is performed
- A CVE affects something in our stack

