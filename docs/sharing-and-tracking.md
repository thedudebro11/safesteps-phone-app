# Sharing & Tracking Relationship

## Rule
A live share session requires active tracking.

Tracking states:
- `idle` → sharing disabled
- `active` → sharing enabled
- `emergency` → sharing enabled

## UX Decisions
- No warning modals or forced navigation
- Disabled buttons communicate availability
- State updates automatically when tracking toggles

## Why UI-level gating
- Fast feedback
- No backend dependency
- Prevents invalid state before it exists

## Safety Principle
The app never claims to share location unless location updates are actually running.
