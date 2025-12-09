
# SafeSteps — Database Schema (Supabase/Postgres)

All tables use **Row Level Security (RLS)** based on `auth.uid()`.

---

# 1. Table: `trusted_contacts`

| Column                   | Type      | Notes                                      |
|--------------------------|-----------|--------------------------------------------|
| id                       | uuid      | PK, default `uuid_generate_v4()`           |
| user_id                  | uuid      | FK → auth.uid()                            |
| name                     | text      | Required                                   |
| contact_email            | text      | Nullable                                   |
| contact_phone            | text      | Nullable                                   |
| receive_emergency_alerts | boolean   | Default `false`                            |
| created_at               | timestamp | Default `now()`                            |

### RLS Policies

```sql
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own contacts"
ON public.trusted_contacts
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

# 2. Table: `location_pings`

| Column     | Type      | Notes                                      |
|------------|-----------|--------------------------------------------|
| id         | uuid      | PK, default `uuid_generate_v4()`           |
| user_id    | uuid      | FK → auth.uid()                            |
| lat        | double    | Required                                   |
| lng        | double    | Required                                   |
| accuracy   | double    | Nullable                                   |
| type       | text      | `'normal'` or `'emergency'`                |
| source     | text      | `'active_tracking'` \| `'emergency_mode'` \| `'manual'` |
| created_at | timestamp | Default `now()`                            |

### RLS Policies

```sql
ALTER TABLE public.location_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own pings"
ON public.location_pings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Recommended Index

```sql
CREATE INDEX idx_location_pings_user_created
ON public.location_pings (user_id, created_at DESC);
```

---

# 3. Table: `share_links` (future)

| Column     | Type      | Notes                                      |
|------------|-----------|--------------------------------------------|
| id         | uuid      | PK                                         |
| user_id    | uuid      | FK → auth.uid()                            |
| token      | text      | Unique random string                       |
| expires_at | timestamp | Optional expiration                        |
| created_at | timestamp | Default `now()`                            |

### RLS Example (planned)

```sql
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own share links"
ON public.share_links
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

# 4. Extensions

Enable UUIDs:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

# 5. Notes

- Tables are isolated per user by RLS.
- No location data is shared unless:
  - User adds a trusted contact, or
  - User explicitly shares a location link.
```

---

# ✅ **THAT’S IT.**

You copy/paste **only** the contents inside those markdown code blocks.

If you'd like, I can also:

- Generate the missing files (`STRUCTURE.md`, `TRACKING_LOGIC.md`, etc.) in the same clean copy/paste format  
- Build the full backend next  
- Build the Home screen map + tracking logic  
- Build the “share live location” feature  

Just tell me.
