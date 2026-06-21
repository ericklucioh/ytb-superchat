# Go Backend

This binary is the shared state layer for YTB Superchat.

## Responsibilities

- serve HTTP endpoints for sessions and overlay events
- serve overlay assets
- keep per-session state in memory
- broadcast updates over WebSocket
- expose keep-awake helpers used by the dashboard

It does not capture chat directly.

## Main Packages

- `cmd/ytb-go`: process entrypoint
- `internal/httpapi`: HTTP routes and runtime env output
- `internal/session`: in-memory session manager
- `internal/ws`: WebSocket room handling
- `internal/keepawake`: keep-awake loop and status

## Key Endpoints

- `GET /health`
- `POST /keep-awake/start`
- `GET /keep-awake/status`
- `GET /api/session`
- `POST /api/session`
- `GET /api/rooms`
- `POST /api/event`
- `GET /ws`
- `GET /overlay`

## Environment

- `PORT`
- `YTB_GO_PORT`
- `YTB_OVERLAY_DIR`
- `YTB_ALLOWED_ORIGINS`
- `PUBLIC_BACKEND_URL`
- `YTB_PUBLIC_BACKEND_URL`
- `YTB_PORTAL_PORT`
- `PORTAL_PORT`
- `YTB_SESSION_REAPER_INTERVAL`
- `YTB_SESSION_REAPER_MAX_AGE`

Optional hardening variables still exist for private deployments, but the public repo no longer pushes shared secrets into browser runtime state.

## Tests

```bash
go test ./...
```
