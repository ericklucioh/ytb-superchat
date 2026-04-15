# ROADMAP

## Current State
- `ytb-go` server skeleton exists in `ytb-go/`.
- Extension and dashboard exist in `extension/` and `src/`.

## Phases

### Phase 1: Local Core
**Goal:** Implement the ytb-go server and its core integrations.
**Requirements:** [LOCAL-01, LOCAL-02, LOCAL-03, LOCAL-04, LOCAL-05, LOCAL-06]
- [ ] LOCAL-01: HTTP server with basic routes (/health, /api/session).
- [ ] LOCAL-02: In-memory session management.
- [ ] LOCAL-03: WebSocket support for event distribution.
- [ ] LOCAL-04: API for event ingestion (/api/event).
- [ ] LOCAL-05: Static file serving for overlays.
- [ ] LOCAL-06: Verifiable implementation with tests.

**Plans:**
- [ ] 01-01-PLAN.md — Foundation & Session Management
- [ ] 01-02-PLAN.md — WebSocket Hub & Overlay Support
- [ ] 01-03-PLAN.md — Event API & Integration

### Phase 2: Overlay Improvements
**Goal:** Enhance the overlay and its synchronization with the dashboard.
[To be planned]

### Phase 3: Dashboard & Extension Sync
**Goal:** Update the dashboard and extension to use the local server.
[To be planned]
