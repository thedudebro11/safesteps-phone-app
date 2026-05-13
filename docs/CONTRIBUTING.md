# Contributing to SafeSteps

Welcome!  
This document outlines how to contribute code, documentation, and ideas to the SafeSteps project.

Even if you are a single developer today, this file ensures future contributors can onboard quickly — including future AI assistants.

---

# 🔧 Development Setup

### 1. Clone the repo

git clone <repo-url>
cd SafeSteps


### 2. Install dependencies

npm install



### 3. Start the mobile app

npx expo start



### 4. Start the backend (once implemented)

npm run dev



---

# 🧱 Code Organization

Frontend lives under:

app/
src/

Backend lives under:

server/src/



Documentation lives under:

docs/



See `/docs/DOCS_INDEX.md` for a complete index.

---

# 🧪 Code Quality

Before pushing changes:

### ✔ Type-check
npm run typecheck



### ✔ Format (if configured)
npm run format



### ✔ Lint (if configured)
npm run lint



---

# 🗂 Commit Message Standards

Use clear, descriptive commit messages.

Examples:

feat(tracking): add emergency mode interval logic
fix(auth): correct session persistence on native
docs: update API spec and changelog
refactor: clean up contacts list component


---

# 📘 Updating Documentation

Every code change must be paired with documentation updates:

| Change Type | Update These Files |
|-------------|-------------------|
| New API route | `/docs/api/API_SPEC.md` |
| DB updates | `/docs/db/DB_SCHEMA.md` |
| Tracking behavior | `/docs/logic/TRACKING_LOGIC.md` |
| Performance tuning | `/docs/performance/PERFORMANCE_NOTES.md` |
| Architecture changes | `/docs/architecture/STRUCTURE.md` |
| Any feature change | `/docs/CHANGELOG.md` |
| Major shifts | `/docs/SAFESTEPS_MASTER_SUMMARY.md` |
| Bugs solved | `/docs/ISSUE_LOG.md` |

This keeps SafeSteps maintainable long-term.

---

# 🔬 Reporting Issues

All debugging sessions and problems should be logged in:

`/docs/ISSUE_LOG.md`

Use the provided template.

---

# 🌱 Adding New Features

When adding a feature:

1. Update the roadmap
2. Update or create relevant documentation
3. Write clean, typed, production-quality code
4. Add commit messages that describe:
   - What changed
   - Why it changed
5. Test the feature on Android + Web (and iOS if applicable)

---

# 🤝 Thank You

Every improvement — code, documentation, design — strengthens SafeSteps for the future.
