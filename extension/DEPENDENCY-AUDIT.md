# Extension Dependency Audit

Scope: the browser extension runtime and the portal/backend interaction path.

## Critical dependencies
- `chrome.runtime` and `chrome.storage` are required for the bridge, session sync, and pending packet replay.
- The Go backend at `/api/event`, `/api/session`, `/api/rooms`, `/ws`, and `/overlay` is required for the production portal overlay flow.
- The portal runtime uses `runtime-env.js` values for API/WebSocket URLs and token propagation.

## Optional or legacy dependencies
- Legacy platform scripts under `extension/sources/` still reference platform-specific endpoints and assets for older connectors, but they are not part of the Twitch/YouTube critical path.
- Any remote avatar enrichment is now optional and no longer blocks Twitch delivery.
- Diagnostic console output and relay snapshots are support-only.

## Removed from the critical path
- Twitch avatar lookup via `api.socialstream.ninja`.
- Any dependency on a hardcoded portal hostname.
- Direct render responsibility in the extension.

## Production judgment
For the current Twitch/YouTube flow, the extension does not depend on external third parties in the delivery path beyond the browser, the local extension bridge, and the local Go backend.
