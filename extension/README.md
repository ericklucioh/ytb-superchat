# Chrome Extension

This folder contains the browser extension and the legacy OBS overlay assets.

## What lives here

- `index.html` - the legacy OBS overlay page
- `manifest.json` - Chrome extension manifest
- `sources/` - chat capture scripts per platform
- `settings/` - extension options UI
- `main.css` - extension-specific styling
- platform assets such as `youtube.png`, `twitch.png`, and `unknown.png`

## What the extension does

The extension reads live chat from supported platforms and sends normalized events to the local dashboard bridge:

- Twitch
- YouTube
- other legacy sources still present in the repo

The current workflow is:

1. Open the supported chat page in Chrome
2. Let the extension capture messages from the page
3. Send those events to the dashboard bridge running in the browser session
4. Show the selected message in the OBS browser source

## Main scripts

- [`sources/shared-runtime.js`](sources/shared-runtime.js) - shared socket, settings, and helper runtime
- [`sources/local-chat-bridge.js`](sources/local-chat-bridge.js) - local Port-based bridge for chat ingestion
- [`sources/dashboard-relay.js`](sources/dashboard-relay.js) - forwards chat events from the extension into the dashboard page
- [`sources/avatar-helpers.js`](sources/avatar-helpers.js) - shared avatar lookup helpers for supported platforms
- [`sources/youtube.js`](sources/youtube.js) - YouTube chat capture
- [`sources/twitch.js`](sources/twitch.js) - Twitch chat capture
- [`settings/options.html`](settings/options.html) - extension settings UI

## OBS overlay

The overlay page is [`index.html`](index.html).

Use it in OBS as a browser source with a session parameter:

```text
http://localhost:8080/overlay?session=YOUR_SESSION_ID
```

The same session ID is used by the dashboard, the extension, and the backend Go server.

## Install for development

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `extension/` folder

After that, open Twitch or YouTube chat and keep the relevant chat page loaded.

## Build output

From the project root:

```bash
npm run build
```

That generates:

- `out/extension/` inside the static build
- `out/chrome-extension.zip` for packaging

## Notes

- The extension still depends on the browser page being open.
- If the chat UI changes, the selector logic may need a refresh.
- The OBS overlay receives the original donation currency display, while the dashboard can still use converted BRL values for totals and ordering.
- Chat ingestion no longer depends on `wss://api.overlay.ninja`; the dashboard now receives chat events through the extension bridge and the overlay is served by the Go backend.
