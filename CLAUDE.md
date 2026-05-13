## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

Known graphify blindspots (go to docs/code directly for these):
- **React Context providers** (TrackingProvider, AuthProvider) appear as thin communities because hook consumers (`useTracking()`, `useAuth()`) don't produce static call edges — they are architecturally central despite low graph weight
- **Runtime side effects** (e.g. AuthProvider's profile upsert invariant) are invisible to AST analysis — see `docs/AUTH_FLOW.md`
- **Cross-layer boundaries** (Mobile → Express → Supabase) are not represented — see `docs/SYSTEM_ARCHITECTURE.md`
- **Test script inflation**: `main()` in `scripts/` is the top god node by edge count but is test harness code, not production architecture

## Known Hardcoded Stubs (intentional deferrals — do not treat as bugs)

These are not bugs. They are placeholders waiting for specific features to be built:

- **`isGuest` → hardcoded `false`** in `src/features/auth/AuthProvider.tsx:124`
  Guest mode is fully specced but not yet implemented. See `docs/AUTH_FLOW.md` Part 2 for the implementation plan. Do not wire `isGuest` until that feature is being built intentionally.

- **`isPremium` → hardcoded `false`** in `src/features/contacts/ContactsProvider.tsx:50`
  Subscription/entitlement check is deferred. The tier logic in `src/lib/tiers.ts` is correct and ready; it just needs a real `isPremium` signal wired in from a subscription provider when billing is added.

## Key Architecture Facts (read before writing code)

- **Express is the primary API** — all trust, visibility, history, push, and emergency operations go through the Express server (`server/`), not Supabase client directly. See `docs/api/API_SPEC.md`.
- **Share sessions are in-memory** — `sharesByToken` Map in `server/index.js` resets on restart. DB-backed sessions are planned.
- **`location_history` not `location_pings`** — the history table is named `location_history`. Any doc or code using `location_pings` for this purpose is wrong.
- **Trusted contacts schema is bidirectional** — `trusted_contacts` uses `requester_user_id / requested_user_id / status`, not `user_id / name / phone`. Acceptance creates a reciprocal row automatically.
