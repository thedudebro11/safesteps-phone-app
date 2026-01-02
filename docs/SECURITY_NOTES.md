# SafeSteps — Security Notes

_Last updated: 2026-01-02_

This document tracks security decisions, verifications, and hardening tasks for the SafeSteps application.

Goals:
- Minimize attack surface
- Preserve privacy-first guarantees
- Keep security decisions auditable and repeatable
- Make it easy for future maintainers (and AI assistants) to reason about risk

---

## 1) Security Philosophy (Non-Negotiables)

SafeSteps is intentionally built as a **privacy-first, minimal-attack-surface** product.

Core principles:
- **No third-party analytics SDKs**
- **No ad networks**
- **No silent background tracking by default**
- **Explicit user intent** required for tracking/sharing/emergency
- **Least-privilege** access everywhere (client has no admin capabilities)
- **Zero trust**: validate inputs, clamp rate, and assume hostile clients
- **Guest mode is local-only by default** (no cloud persistence)

---

## 2) Client App Security (Expo / React Native)

Stack:
- Expo (React Native)
- Expo Router
- TypeScript

Security implications:
- No SSR, no server-side deserialization surface (client-only runtime)
- Primary threats are:
  - device compromise
  - token theft (if mishandled)
  - network tampering (mitigated by TLS + auth)
  - abused endpoints (mitigated by rate limits + server validation)

### 2.1 Dependency / Supply Chain Hygiene
- Lockfiles committed
- Regular `npm audit` / `pnpm audit` checks
- Avoid introducing heavy third-party SDKs, especially analytics

---

## 3) CVE Tracking & Applicability

### 3.1 CVE-2025-55182 (React Server Components / RCE)
**Status: Not Applicable to SafeSteps mobile app (Expo RN).**

Reasoning:
- CVE-2025-55182 affects **React Server Components** packages that deserialize payloads at **Server Function endpoints**, enabling pre-auth remote code execution in vulnerable server deployments. :contentReference[oaicite:0]{index=0}
- SafeSteps is a **client-only** Expo app:
  - does not run React Server Components
  - does not expose Server Function endpoints
  - does not deploy RSC server runtimes in the mobile client

Verification approach (keep doing this for future CVEs):
- Confirm affected packages are not installed (`npm ls <pkg>`, `npm why <pkg>`)
- Confirm the app does not introduce server-side RSC endpoints
- If any web backend is introduced later, re-evaluate applicability

---

## 4) Authentication & Session Security (Supabase)

Supabase provides:
- Auth (email/password)
- JWT session tokens
- Row Level Security (RLS) for Postgres tables

SafeSteps rules:
- **Never** embed Supabase **service role** keys in the client
- Client uses only anon/public keys + user JWT
- All user-scoped database access enforced via **RLS**
- Store session securely on-device:
  - Native: SecureStore
  - Web fallback: memory/local fallback as designed (minimize persistence)

Auth flow details live in:
- `docs/AUTH_FLOW.md` (authoritative)

---

## 5) Authorization Model (RLS + Server-Side Enforcement)

### 5.1 RLS: “Users can only access their own rows”
- All private tables MUST enforce:
  - `user_id = auth.uid()`
- No “public read” tables for sensitive data

### 5.2 Public Share Viewing MUST NOT rely on open table reads
Public viewer pages (share links) are inherently high-risk. Therefore:
- Viewer access should be mediated via:
  - Supabase Edge Function or server route
  - token verification + rate limiting
  - minimal returned data

---

## 6) Sharing Security Model (V1 Critical)

Sharing creates the highest exposure surface. V1 must enforce:

### 6.1 Share Tokens
- Generate high-entropy tokens (>= 128 bits)
- Store only **hashed tokens** server-side (e.g., SHA-256(token))
- Never store raw tokens in DB
- Links contain raw token; server compares hash(token) to stored hash

### 6.2 Recipient Controls & Abuse Prevention
- Viewer can:
  - Stop receiving (revoke token)
  - Block sender (future share creation denied)
- For guests:
  - Stable `sender_device_id` stored locally and included with share
  - Blocklist entries bind:
    - recipient identifier hash (email/phone hash)
    - blocked sender_device_id (guest) OR sender_user_id (authed)

### 6.3 Rate Limiting & Anti-Abuse
- Rate limit share creation and viewer fetch:
  - by IP
  - by sender identity (user_id/device_id)
  - by token
- Prevent token guessing / brute force:
  - strict 404/401 behavior + throttling
  - consider progressive delays / temporary bans on repeated invalid tokens

---

## 7) Location Data Handling

### 7.1 Collection Rules
Location is used only when:
- user manually requests an action (e.g., share)
- Active Tracking is toggled ON
- Emergency is toggled ON (account-only)

### 7.2 Storage Rules (V1)
- Guest:
  - local-only history buffer
  - no cloud persistence by default
  - ephemeral relay allowed only during an active share session (if enabled)
- Authenticated:
  - location history stored under RLS
  - emergency pings are explicitly labeled and visually distinct

### 7.3 Data Minimization
Store only what is required:
- lat/lng
- accuracy
- timestamp
- type (user ping / trusted-contact share ping / emergency)
- optional contact reference (id) when relevant

Avoid storing:
- extra device identifiers unless required for abuse prevention
- unnecessary metadata (carrier, Wi-Fi SSIDs, etc.)

---

## 8) Backend / Edge Function Security (When Implemented)

If/when we add server routes or Edge Functions:
- Verify Supabase JWT on every authenticated route
- Validate input schema (Zod)
- Clamp frequency / prevent spam
- Log suspicious patterns (without collecting sensitive user data)
- CORS: strict allowlist (production)
- Don’t leak details in errors (no stack traces to client)

---

## 9) Hardening TODO (Shortlist)

Near-term:
- Add Zod validation for all client→server requests
- Implement rate limits for:
  - share creation
  - token validation
  - emergency ping endpoints
- Add token hashing + revoke/block enforcement (share model)
- Add security checks to CI:
  - dependency audit
  - lint rules preventing secret leakage

Later:
- Lightweight abuse heuristics (burst detection)
- WAF / CDN protections for public viewer endpoints
- Periodic “security release cadence” (30–60 days)

---

## 10) Update Policy

Update this file when:
- Dependencies change
- A new API/Edge Function ships
- Sharing model changes
- A CVE is evaluated for applicability
- A security review/audit is performed
