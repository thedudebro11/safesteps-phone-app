# SafeSteps Documentation Index

This file serves as the master directory of all SafeSteps documentation.  
Use this to quickly navigate the system architecture, APIs, logic, and development notes.

---

# 📘 Core Project Docs

- **SAFESTEPS_MASTER_SUMMARY.md**  
  High-level overview of the entire project: vision, architecture, features, and current status.

- **ROADMAP.md**  
  Structured future development plan: v1 → v2 → v3.

- **CHANGELOG.md**  
  Everything that has changed in SafeSteps, version by version.

- **DESIGN_GUIDE.md**  
  UI/UX rules, spacing, colors, themes, and screen layout principles.

- **ISSUE_LOG.md**  
  Full written history of problems encountered and how they were solved.

---

# 🏗 Architecture

Located in: `/docs/architecture/`

- **STRUCTURE.md**  
  File/folder layout, how the Expo + server codebases are organized, and how layers of the app interact.

---

# 🔌 API Documentation

Located in: `/docs/api/`

- **API_SPEC.md**  
  Full list of backend endpoints, request/response structures, error handling, and authentication requirements.

---

# 🗄 Database Documentation

Located in: `/docs/db/`

- **DB_SCHEMA.md**  
  Table structures, RLS policies, indexes, and future schema plans.

---

# 🧠 Logic & Behavior Documentation

Located in: `/docs/logic/`

- **TRACKING_LOGIC.md**  
  Full behavior of Active Tracking, Emergency Mode, intervals, permissions, and edge cases.

---

# 🚀 Performance Documentation

Located in: `/docs/performance/`

- **PERFORMANCE_NOTES.md**  
  Performance strategy, expected bottlenecks, long-term tuning principles, and profiling notes.

---

# 📚 How to Use This Index

Whenever you:

- Add a new feature  
- Change architecture  
- Add a DB table  
- Adjust API routes  
- Solve a bug  

Update the relevant doc, then append an entry to:

- `CHANGELOG.md`
- `ISSUE_LOG.md` (if debugging was involved)
- `SAFESTEPS_MASTER_SUMMARY.md` (if major change)

This creates a self-updating “brain” of the SafeSteps project.

---

# 🔮 Future Documentation

Potential expansions:

- `SECURITY_MODEL.md`
- `BACKGROUND_TASKS.md`
- `TESTING_STRATEGY.md`
- `RELEASE_CHECKLIST.md`
- `MIGRATION_NOTES.md`

These can be added once v1 is stable.

---

# 📌 Reminder

Documentation is part of the product.  
If the code changes and the docs don’t, the entire system becomes fragile.  
Keep docs and code evolving together.
