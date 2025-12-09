# SafeSteps — API Specification

Base URL (development):  
`http://localhost:4000`

Authentication:
All protected endpoints require the header:

```

Authorization: Bearer <supabase_access_token>

````

---

# 1. Health Check

### GET `/health`

**Description:**  
Simple operational check.

**Auth:** None

**Response:**
```json
{ "status": "ok" }
````

---

# 2. Location Pings

## POST `/api/locations`

**Description:**
Creates a new location ping for the authenticated user.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "lat": 32.123456,
  "lng": -110.123456,
  "accuracy": 8.5,
  "type": "normal",
  "source": "active_tracking"
}
```

Valid values:

* `type`: `"normal"` | `"emergency"`
* `source`: `"active_tracking"` | `"emergency_mode"` | `"manual"`

**Response (201 Created):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "lat": 32.123456,
  "lng": -110.123456,
  "accuracy": 8.5,
  "type": "normal",
  "source": "active_tracking",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## GET `/api/history`

**Description:**
Returns paginated location history for the authenticated user.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Params:**

* `limit` (default: 50)
* `offset` (default: 0)

**Response Example:**

```json
{
  "items": [
    {
      "id": "uuid",
      "lat": 32.123456,
      "lng": -110.123456,
      "accuracy": 10.0,
      "type": "normal",
      "source": "active_tracking",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 42
}
```

---

# 3. Trusted Contacts

## GET `/api/contacts`

**Description:**
Lists all trusted contacts for the authenticated user.

**Headers:**

```
Authorization: Bearer <token>
```

**Response Example:**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Mom",
    "contact_email": "mom@example.com",
    "contact_phone": null,
    "receive_emergency_alerts": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

## POST `/api/contacts`

**Description:**
Create a new trusted contact.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body Example:**

```json
{
  "name": "Mom",
  "contact_email": "mom@example.com",
  "contact_phone": null,
  "receive_emergency_alerts": true
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Mom",
  "contact_email": "mom@example.com",
  "contact_phone": null,
  "receive_emergency_alerts": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## DELETE `/api/contacts/:id`

**Description:**
Delete a trusted contact belonging to the authenticated user.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (204 No Content):**

```
(no body)
```

---

# 4. Shareable Live Location Links (Future)

## POST `/api/share-links`

**Description:**
Generate a token-based URL for sharing user’s live location with anyone (no login required).

Status: *Future feature.*

---

## GET `/api/share-links/:token`

**Description:**
Returns the latest known location for the user who created the share token.

Status: *Not yet implemented.*

```

---

