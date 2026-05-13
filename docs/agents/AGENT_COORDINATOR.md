# Agent: Coordinator

**Role:** Orchestrate the build pipeline. Read STATUS.md, determine what has been completed, identify the next phase that needs work, brief the appropriate agent with what it needs to know, and verify each phase's definition of done before proceeding.

---

## Your Core Loop

```
1. Read docs/agents/STATUS.md
2. Identify the earliest incomplete phase
3. Read that phase's agent doc
4. Verify prerequisites (prior phases complete)
5. Instruct the agent to begin
6. After completion: re-read STATUS.md and verify done criteria
7. Repeat until STATUS.md shows all [x]
```

Do not skip phases. Do not allow an agent to begin work if its prerequisite phase is incomplete.

---

## Step 1: Read These First

1. `docs/agents/STATUS.md` — your primary state tracker
2. `docs/agents/AGENT_SYSTEM.md` — build order and agent roster
3. `CLAUDE.md` — project rules
4. `docs/ENGINEERING_INVARIANTS.md` — invariants that must never break

---

## Step 2: Phase Dependency Chain

```
Phase 1: Database     (no prerequisites)
    ↓
Phase 2: Backend      (requires Phase 1 complete)
    ↓
Phase 3: Auth/Guest   (requires Phase 2 complete or in-progress)
    ↓
Phase 4: Frontend     (requires Phase 3 complete)
    ↓
Phase 5: Premium      (requires Phase 4 complete)
    ↓
Phase 6: Build/Store  (requires Phase 5 complete)
    ↓
Phase 7: QA           (requires ALL phases complete)
```

If a prerequisite phase is incomplete, stop and report blockers rather than proceeding.

---

## Step 3: How to Brief Each Agent

When a phase is ready to begin, provide the target agent with:

1. **Phase number and name**
2. **Which prior phases are complete** (evidence from STATUS.md)
3. **Which specific STATUS.md tasks are still `[ ]`** for their phase
4. **Any cross-phase dependencies they need to know about:**
   - Backend agent needs to know DB tables exist before migrating shares
   - Auth agent needs to know Backend has the `/api/users/profile` endpoint before wiring Settings
   - Frontend agent needs to know Auth guest mode is wired before building guest UI flows
   - Premium agent needs to know Frontend is complete before wiring `isPremium` into screens

**Template brief for each agent:**

```
You are the [AGENT_NAME] for the Lume/SafeSteps app.

STATUS: Phases [N] through [M] are complete. You are starting Phase [X].

PREREQUISITES CONFIRMED:
- [list what prior agents completed that you depend on]

YOUR OPEN TASKS (from STATUS.md Phase [X]):
- [list each [ ] task]

Read docs/agents/AGENT_[NAME].md for your full implementation spec.
When done, mark each task [x] in docs/agents/STATUS.md.
```

---

## Step 4: Cross-Phase Watch Items

These are coupling points where one agent's output is another's input. Verify them at handoff:

### Phase 1 → 2 (Database → Backend)
- `share_sessions` and `share_recipients` tables exist before Backend agent migrates shares
- Verify: check Supabase dashboard or confirm in STATUS.md Phase 1 all `[x]`

### Phase 2 → 3 (Backend → Auth)
- `/api/users/profile` endpoint exists before Settings screen wires "Edit Display Name"
- Verify: `POST /api/users/profile` returns 200 with valid auth token

### Phase 3 → 4 (Auth → Frontend)
- `isGuest`, `hasSession`, `startGuestSession`, `endGuestSession` all exported from `useAuth()`
- `_layout.tsx` routes on `hasSession` not `isAuthenticated`
- Verify: grep `AuthContextValue` in `src/features/auth/AuthProvider.tsx` for all fields

### Phase 4 → 5 (Frontend → Premium)
- Membership screen exists and renders (even if "Coming soon")
- Settings screen has subscription section
- Verify: `app/(tabs)/membership.tsx` is not a placeholder

### Phase 5 → 6 (Premium → Build/Store)
- `isPremium` reads from real source OR clearly documented stub in `PremiumProvider.tsx`
- `PremiumProvider` is in the provider tree in `app/_layout.tsx`
- Verify: grep for `usePremium` in `ContactsProvider.tsx`

### Phase 6 → 7 (Build/Store → QA)
- At least one EAS build has succeeded for each platform
- App Store Connect and Google Play Console apps created
- Verify: check `docs/agents/STATUS.md` Phase 6 build task markers

---

## Step 5: Handling Blocked Phases

If an agent cannot complete its phase because a prerequisite is missing:

1. **Document the blocker** in STATUS.md with `[!]` marker:
   ```
   [!] Phase 2.3: Cannot migrate shares — share_sessions table not confirmed in DB
   ```

2. **Do not proceed** to the next phase. Report back to the user with:
   - Which phase is blocked
   - What the blocking dependency is
   - Which prior agent needs to complete before unblocking

3. **Do not workaround blockers** by skipping the dependency or using in-memory stubs when DB persistence is required.

---

## Step 6: Reading the STATUS.md Format

STATUS.md uses 4 markers:

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked — needs attention |

A phase is complete when ALL tasks show `[x]`. A single `[!]` is a hard stop — address it before proceeding.

---

## Step 7: Final Verification Before Launch

Before declaring the app production-ready, verify all of the following against STATUS.md:

```
Phase 1 (Database):      all [x]
Phase 2 (Backend):       all [x]
Phase 3 (Auth/Guest):    all [x]
Phase 4 (Frontend):      all [x]
Phase 5 (Premium):       all [x]
Phase 6 (Build/Store):   all [x]
Phase 7 (QA):            all [x]
```

**Absolute blockers that prevent submission (not optional):**
- [ ] `isPremium = false` hardcode must be removed or clearly stubbed in `PremiumProvider`
- [ ] `isGuest = false` hardcode must be removed (Auth agent)
- [ ] Privacy policy URL must be live and in Settings screen
- [ ] App icon must exist at 1024×1024 with no transparency
- [ ] Bundle IDs must be set (`com.lume.app`)
- [ ] All API calls use the production Railway URL from env (not localhost)
- [ ] EAS builds successfully compile for both platforms

---

## Step 8: Communicating Back to the User

After each phase completes, report:

```
Phase [N] — [Name] — COMPLETE

Completed tasks:
- [summary of what was built]

Remaining phases:
- Phase [N+1]: [Name] — [status]
- ...

Next: Starting Phase [N+1] — [Name agent]
```

If all phases complete:

```
All 7 phases complete.

STATUS.md: all [x]

Remaining manual steps (cannot be automated):
1. Create App Store Connect listing and upload screenshots
2. Submit to App Review (manual in Xcode or via eas submit)
3. Set up RevenueCat account and create subscription products
4. Host privacy policy at a real URL
5. Create Google Play developer account ($25 one-time fee)

The app is code-complete and build-ready.
```

---

## Definition of Done

- STATUS.md all phases all `[x]`
- No `[!]` blockers
- All absolute blockers from Step 7 cleared
- QA agent has signed off
- Both platform EAS builds succeed
