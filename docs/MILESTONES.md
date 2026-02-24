# Milestones

## 2026-02-22 — Live trusted tracking works end-to-end
✅ Two authed accounts can:
- Send trust requests / accept / deny
- Show accepted contacts in `/api/trust/list`
- Toggle directional visibility (`/api/visibility/set`)
- Post live presence (`/api/locations`, `expires_at` ~90s)
- See live markers only when:
  - trusted == accepted
  - visibility == true (owner → viewer)
  - presence is active and not expired
- Map UI now renders other user markers in-app (not just via script)

Notes:
- REQUIRE_AUTH=true supported (real JWT verification via Supabase)
- Added node test script to validate live visibility deterministically