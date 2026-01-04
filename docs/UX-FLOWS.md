# UX Flows (v1)

## Emergency Flow (Recipient Picker)
1. Home → Tap “Emergency”
2. Recipient picker modal opens
3. User selects up to tier limit recipients
4. Confirm → emergency shares created for selected contacts
5. Emergency tracking starts (fixed frequency)
6. Stopping behavior:
   - Stop Emergency on Home:
     - Stops emergency mode
     - Ends all emergency shares
   - End the last emergency share in Contacts or Shares:
     - Automatically stops emergency mode on Home

## Trusted Contacts (Limit Enforcement)
- Contact creation uses ContactsProvider tier limit enforcement.
- If user is at limit, addContact throws error → UI shows alert with message.
- Contacts screen intentionally does NOT hardcode limits to avoid mismatch.
