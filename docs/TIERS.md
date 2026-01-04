# Tiers (v1)

## Guest (Local Only)
- Trusted contacts: limit enforced by provider (currently 1)
- Emergency recipients picker: limit enforced by tiers (currently 1)
- Sharing:
  - Can create share links when tracking is active/emergency
  - Emergency mode syncs correctly across Home/Contacts/Shares

## Signed-in (Free)
- Trusted contacts: should be limited (planned: 3)
- Emergency recipients: should follow tier limit (planned: 3)
- Same emergency sync behavior as guest
  - NOTE: ensure all share ending logic uses emergencySync helper

## Premium
- Higher limits for contacts + emergency recipients (planned)
- Same UX + logic, only limits change
