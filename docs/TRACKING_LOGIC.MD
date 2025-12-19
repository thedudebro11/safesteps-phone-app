## Tracking → Share Link Interaction (v1)

Tracking modes (Active/Emergency) control when location pings occur.

Sharing is an additional layer:

- If sharing is OFF: pings are stored locally (guest) and/or sent to backend (authenticated) per normal tracking rules.
- If sharing is ON:
  - Authenticated: pings can be used to serve share viewers (recipient links).
  - Guest: pings additionally send a minimal live snapshot to the share relay endpoint for the duration of the share session only.

Emergency mode overrides active tracking and may be surfaced to share viewers via an `isEmergency` flag.
