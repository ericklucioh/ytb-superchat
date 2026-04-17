# Streamer Site

This folder contains the streamer dashboard and the shared site code used by the main web app.

## What lives here

- `landing.html` - the public landing page for `/`
- `index.html` - the main dashboard page
- `streamer.css` - styling for the dashboard UI
- `logoWhite.svg`, `youtube.png`, `twitch.png` - local assets used by the site
- `site/` - the dashboard application code
- `scripts/` - local development and build helpers

## Dashboard behavior

The dashboard is the control panel for the project:

- manages the current session ID
- shows Twitch subs, YouTube members, superchats, and live chat
- lets you filter messages by status
- lets you promote a message to the overlay by clicking it
- stores UI state in `localStorage`
- sends overlay events to the Go backend

## Main code files

- [`site/streamer-app.js`](site/streamer-app.js) - bootstraps the app, connects to the local bridge, and drives rendering
- [`site/streamer-store.js`](site/streamer-store.js) - persists state and normalizes incoming events
- [`site/streamer-view.js`](site/streamer-view.js) - renders the panels, summary, and detail popups
- [`site/streamer-text.js`](site/streamer-text.js) - shared text and parsing helpers
- [`site/streamer-currency.js`](site/streamer-currency.js) - currency parsing and formatting
- [`site/streamer-events.js`](site/streamer-events.js) - event normalization, payload building, and sorting helpers
- [`site/streamer-rates.js`](site/streamer-rates.js) - BRL conversion and currency rate caching
- [`site/streamer-utils.js`](site/streamer-utils.js) - compatibility re-export for shared helpers

## Development

From the project root:

```bash
npm run dev
```

The local server defaults to port `8000`.

Useful URLs:

- `https://ytb.ericklucioh.com/`
- `https://ytb.ericklucioh.com/portal`
- `http://localhost:8000/`
- `http://localhost:8000/portal`
- `http://localhost:8000/overlay?session=YOUR_SESSION_ID`

If you want to serve manually:

```bash
npm run serve
```

You can also set a custom port:

```bash
PORT=9000 npm run serve
```

Linux shell wrappers are also available under `src/scripts/*.sh` if you want to run the helpers directly.

## Build

```bash
npm run build
```

This copies the site into `out/`, publishes the overlay under `out/portal/overlay/`, and also packages the extension zip.

## Session flow

The dashboard accepts a session in a few ways:

- URL parameter `?session=...`
- URL parameter `?s=...`
- `localStorage`
- Chrome extension storage when the extension is installed

## Notes

- Superchat conversion is used internally for ordering and totals in the dashboard.
- The OBS overlay keeps the original currency display.
- The site does not capture chat on its own. It consumes events coming from the Chrome extension bridge and publishes overlay updates to the Go backend.
- `/src/index.html` is kept as a temporary redirect to `/portal` for compatibility.
