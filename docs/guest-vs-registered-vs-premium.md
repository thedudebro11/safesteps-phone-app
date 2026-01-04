## Tier limits (V1)

### Emergency recipient selection
Controlled by `getEmergencyRecipientLimit()`:

- Guest: 1
- Registered: 3
- Premium: 10 (later: Infinity)

### Trusted contacts (guest restriction)
Guest accounts may only add **1 trusted contact**.

Enforcement:
- UI disables/hides/blocks adding more than 1 contact for guests
- Logic also blocks it to prevent bypass
