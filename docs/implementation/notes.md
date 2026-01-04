## Hook usage gotcha (Contacts white screen)
Issue: calling hooks (`useShares`, `useTracking`) outside the component caused blank screen / provider errors.

Fix:
- Keep all hook calls INSIDE `ContactsScreen()`.
- Avoid referencing values (ex: `mode`) before the hook declaration.
