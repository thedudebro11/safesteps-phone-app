# SafeSteps – Changelog

All notable changes to this project will be documented in this file.

Format: Keep a running **[Unreleased]** section, and cut releases when versions are tagged.

---

## [Unreleased]

### Added
- Initial Expo + React Native + Expo Router setup
- Tab navigation (Home, Contacts, History, Settings)
- Auth stack (login, register)
- Supabase client + environment configuration
- AuthProvider + useAuth with session persistence
- Settings screen with account info and logout

### Changed
- N/A

### Fixed
- Logout / Exit Guest Mode from the Settings screen now reliably clears auth/guest state and redirects back to `/login` on web and native.

---

## [0.1.0] – (pre-v1 internal)
> Placeholder for first internal milestone.
- Project initialized

