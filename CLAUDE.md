## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

Known graphify blindspots (go to docs/code directly for these):
- **React Context providers** (TrackingProvider, AuthProvider) appear as thin communities because hook consumers (`useTracking()`, `useAuth()`) don't produce static call edges — they are architecturally central despite low graph weight
- **Runtime side effects** (e.g. AuthProvider's profile upsert invariant) are invisible to AST analysis — see `docs/AUTH_FLOW.md`
- **Cross-layer boundaries** (Mobile → Express → Supabase) are not represented — see `docs/SYSTEM_ARCHITECTURE.md`
- **Test script inflation**: `main()` in `scripts/` is the top god node by edge count but is test harness code, not production architecture
