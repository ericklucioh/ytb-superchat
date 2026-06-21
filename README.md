# YTB Superchat

YTB Superchat is a live chat control room for streamers. It captures messages from supported live chat pages, centralizes them in a browser dashboard, and publishes selected messages to an OBS-ready overlay URL.

The project is intentionally split into three pieces: a browser extension for capture, a static portal for moderation and selection, and a Go backend for session state, overlay delivery, and realtime broadcast.

## Why This Project Exists

Streamers often bounce between multiple chat windows, moderation panels, and OBS sources. This project reduces that friction by turning live chat capture and on-stream highlighting into one workflow.

## Features

- Captures live chat from the supported browser pages.
- Normalizes chat events into a single dashboard flow.
- Lets the streamer promote selected messages to an OBS overlay.
- Uses a session-aware Go backend to keep overlay state and realtime updates.
- Supports local development with mock mode for layout and UX work.

## Supported Flow

Primary supported flow today:

- YouTube live chat
- Twitch pop-out chat
- Kick support is present in the extension, but should be treated as secondary until verified in your own setup

Legacy and experimental sources still exist in the extension codebase. They are not the main maintained path and should not be treated as guaranteed integrations.

## Architecture

High-level flow:

1. The extension reads messages from a supported chat page.
2. The dashboard receives normalized events through the local bridge.
3. The dashboard promotes selected messages to the Go backend.
4. OBS consumes `/overlay?session=...` from the backend.
5. The backend keeps the latest overlay state per session and broadcasts updates over WebSocket.

Project layout:

- `src/`: landing page, streamer dashboard, overlay assets, and build/runtime scripts
- `extension/`: Chrome extension used for chat capture and local bridge delivery
- `ytb-go/`: Go backend responsible for sessions, overlay state, HTTP API, and WebSocket fanout
- `docs/`: public-facing architecture, security, and scope documentation

More detail:

- [docs/architecture.md](docs/architecture.md)
- [docs/security.md](docs/security.md)
- [docs/extension-scope.md](docs/extension-scope.md)
- [docs/public-release.md](docs/public-release.md)

## Security Model

This public version no longer injects a shared API token into browser runtime state or overlay URLs.

Important implications:

- Browser clients are treated as public clients.
- The default local/public setup is intended for development, demos, and self-hosted usage.
- If you need stronger production hardening, place the backend behind your own auth and trusted network boundary rather than distributing a shared client secret.

See [docs/security.md](docs/security.md) for the current trust model and residual risks.

## Development

Prerequisites:

- Node.js 20+
- Go 1.22+ or the version declared in `ytb-go/go.mod`
- Chrome or a Chromium-based browser for extension loading

From the project root:

```bash
npm run dev
```

Useful local URLs:

- `http://localhost:8000/`
- `http://localhost:8000/portal`
- `http://localhost:8000/overlay?session=YOUR_SESSION_ID`

Load the extension for development:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `extension/` directory

Environment examples:

- `.env.example`
- `.env.development.example`
- `.env.production.example`

## Testing

Frontend and extension tests:

```bash
node --test src/tests/*.test.js extension/tests/*.test.js
```

Backend tests:

```bash
cd ytb-go
go test ./...
```

## Build

```bash
npm run build
```

Build outputs:

- `out/`
- `out/overlay/`
- `out/portal/overlay/`
- `out/chrome-extension.zip`

## Known Limitations

- The extension depends on the target chat page structure. Platform UI changes may require selector updates.
- Session state is stored in memory on the backend. There is no durable persistence yet.
- The extension still contains legacy integrations that are not part of the main maintained path.
- The dashboard runtime is still more monolithic than ideal, although the public repo now documents the intended boundaries clearly.

## Roadmap

- Split larger frontend bridge/bootstrap modules into smaller responsibilities
- Tighten extension scope around officially supported platforms
- Add a stronger deploy story for production hardening
- Improve persistence and operational observability in the Go backend

## About This Project

This repository is published as a product-and-engineering portfolio project: it demonstrates browser-extension capture, realtime session state, overlay rendering, and end-to-end delivery across frontend and Go backend layers.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
