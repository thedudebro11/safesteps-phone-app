# SafeSteps – Privacy-First Personal Safety App

SafeSteps is a **privacy-first GPS safety application** built with Expo + React Native, Supabase, and an Express backend.  
It allows users to:

- Share their live location only when they choose  
- Enable **Active Tracking** at custom intervals  
- Trigger **Emergency Mode** with high-frequency pings  
- Maintain **Trusted Contacts** who can receive emergency alerts  
- View **Location History** with normal vs emergency ping labeling  
- Share a **Live Location Link** with anyone (future)  

SafeSteps focuses on **user control**, **battery efficiency**, and **zero surveillance** — tracking is only active when a user explicitly enables it.

---

## 🚀 Tech Stack

### **Frontend**
- Expo (React Native)
- TypeScript
- Expo Router
- Supabase JS Client
- SecureStore (for native session persistence)

### **Backend**
- Node.js + Express
- Supabase (Auth + Postgres + RLS)
- JWT verification on all protected routes

### **Database**
- `trusted_contacts`
- `location_pings`
- (Future) `share_links`

---

## 📁 Project Structure (Simplified)

/app
(auth)/
(tabs)/
_layout.tsx
index.tsx

/src
features/
auth/
tracking/
contacts/
history/
lib/
supabase.ts

/server
src/
routes/
services/
middleware/
config/

docs/
SAFESTEPS_MASTER_SUMMARY.md
ROADMAP.md
CHANGELOG.md
DESIGN_GUIDE.md
ISSUE_LOG.md
...


---

## 📘 Documentation

All major documentation files are kept under `/docs`.

See **DOCS_INDEX.md** for a master directory of all documentation.

---

## 🧪 Development

### Start the mobile app:
npx expo start


### Start the backend (once generated):
npm run dev


### TypeScript checks:
npm run typecheck

## 🛡 Privacy Philosophy

SafeSteps does *not* require “Always-Allow Location.”  
It only tracks when:

- User activates **Active Tracking**, or  
- User activates **Emergency Mode**  

No background tracking is forced.  
No analytics SDKs.  
No silent data collection.  

---

## 🧭 Roadmap

See `docs/ROADMAP.md`.

---

## 💬 Issues

If you encounter problems or architectural decisions, log them in:

`docs/ISSUE_LOG.md`

---

## 📝 License

SafeSteps is owned by the creator. License TBD.
