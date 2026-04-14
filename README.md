# YTB Superchat

Overlay and streamer dashboard for Twitch and YouTube live chat.

This repo is split into two parts:

- `src/` - the streamer dashboard and local site
- `extension/` - the Chrome extension and OBS overlay

## What this project does

- Captures Twitch and YouTube live chat
- Shows messages in a streamer dashboard
- Sends selected messages to the OBS overlay
- Persists dashboard state locally
- Supports superchats, subs, members, and normal chat messages

## Project Structure

- [`README.md`](README.md) - project overview and setup
- [`src/README.md`](src/README.md) - streamer dashboard and local site
- [`extension/README.md`](extension/README.md) - Chrome extension and OBS overlay

## Run locally

```bash
npm run dev
```

The local server defaults to `http://localhost:8000`.

Useful URLs:

- `https://ytb.ericklucioh.com/` - main streamer dashboard
- `http://localhost:8000/src/index.html` - local test dashboard
- `http://localhost:8000/extension/index.html?session=YOUR_SESSION_ID` - local OBS overlay

## Build

```bash
npm run build
```

This creates:

- `out/` - static site build
- `out/chrome-extension.zip` - packaged Chrome extension

## Chrome extension

Load `extension/` unpacked in Chrome while developing:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `extension/` folder

## Session flow

- The dashboard stores the current session ID in `localStorage`
- The dashboard can also read `?session=...` from the URL
- The extension uses the same session ID to send chat data into the dashboard bridge
- The OBS overlay still uses its own browser-source session flow

## Main files

- [`src/index.html`](src/index.html) - streamer dashboard entry point
- [`src/site/streamer-app.js`](src/site/streamer-app.js) - dashboard bootstrap and local bridge flow
- [`src/site/streamer-store.js`](src/site/streamer-store.js) - persisted state and normalization
- [`src/site/streamer-view.js`](src/site/streamer-view.js) - UI rendering helpers
- [`src/site/streamer-text.js`](src/site/streamer-text.js) - shared text, parsing, and normalization helpers
- [`src/site/streamer-currency.js`](src/site/streamer-currency.js) - currency parsing and formatting
- [`src/site/streamer-events.js`](src/site/streamer-events.js) - event normalization, payload building, and comparisons
- [`src/site/streamer-rates.js`](src/site/streamer-rates.js) - BRL conversion and rate caching
- [`src/site/streamer-utils.js`](src/site/streamer-utils.js) - compatibility re-export for shared helpers
- [`extension/index.html`](extension/index.html) - OBS overlay renderer
- [`extension/sources/youtube.js`](extension/sources/youtube.js) - YouTube chat capture
- [`extension/sources/twitch.js`](extension/sources/twitch.js) - Twitch chat capture

## Notes

- The overlay still depends on the browser tab/page being open for the chat sources.
- If you change extension code, rebuild and reload the extension.
- If you change the dashboard code, refresh the local site.

## Origin

This project is based on the original live chat overlay work by Steve Seguin, with a streamer dashboard and Twitch/YouTube workflow layered on top.
