# Portal And Overlay

This directory contains the public site, streamer dashboard, overlay assets, and the build/runtime scripts used by the web side of the project.

## What Lives Here

- `landing.html`: public landing page
- `index.html`: streamer dashboard entry
- `overlay/`: OBS overlay assets
- `site/`: dashboard application code
- `scripts/`: dev/build/runtime helpers

## Responsibilities

The portal:

- receives chat events from the extension bridge
- stores UI state locally in the browser
- manages the bridge session and a separate overlay session
- sends selected overlay payloads to the Go backend

The overlay:

- subscribes to the backend session over WebSocket
- renders the current highlighted message for OBS/browser source usage

## Runtime Notes

The public repo no longer injects a shared secret into frontend runtime state.

Important environment variables:

- `PORT`
- `YTB_GO_PORT`
- `YTB_OVERLAY_API_BASE_URL`
- `PUBLIC_BACKEND_URL`
- `YTB_PUBLIC_BACKEND_URL`
- `YTB_OVERLAY_WS_URL`
- `YTB_SESSION_ID`
- `YTB_PORTAL_MOCK`
- `YTB_DEBUG_LOGS`

## Local Development

```bash
npm run dev
```

Useful URLs:

- `http://localhost:8000/`
- `http://localhost:8000/portal`
- `http://localhost:8000/overlay?session=YOUR_SESSION_ID`

Mock mode:

```bash
YTB_PORTAL_MOCK=1 npm run dev
```

## Build

```bash
npm run build
```

That produces the public site and overlay assets under `out/`.
