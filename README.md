# Chat Overlay for YouTube, Twitch & more

Chrome extension and local overlay project for highlighting live chat messages in OBS, plus a separate streamer dashboard for monitoring Twitch and YouTube together.

## What this fork does

- Keeps the OBS overlay flow intact inside `extension/`
- Adds a streamer panel at the repository root `index.html`
- Unifies Twitch + YouTube into one live control surface
- Persists dashboard state in `localStorage`
- Lets you click a chat item in the dashboard to send it to the OBS overlay

## Recommended workflow

This fork is designed to be opened with a local web server such as Live Server.

- `index.html` is the main site and streamer control panel
- `extension/index.html` is the OBS overlay page
- The Chrome extension lives under `extension/` and is still used to capture Twitch and YouTube chat events
- `npm run build` also creates `out/chrome-extension.zip` for the extension package

## Run locally

### Recommended on Windows: PowerShell

Start a local server from the project root:

```powershell
.\scripts\serve.ps1
```

Open the pages in your browser:

```powershell
.\scripts\open-streamer.ps1
.\scripts\open-overlay.ps1 -Session YOUR_SESSION_ID
```

The default server port is `8000`.

### Alternative: npm scripts

If you prefer Node tooling:

```bash
npm run open:site
npm run serve
npm run open:streamer
npm run open:overlay
```

You can override the port with a `.env` file or in PowerShell:

```powershell
$env:PORT=9000; npm run serve
```

Or create a local `.env` file from `.env.example`.

### Alternative: VS Code Live Server

Open the folder in VS Code and start Live Server from:

- `index.html`
- `extension/index.html`

## Extension install

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this repository folder

Then open Twitch or YouTube popout chat with the extension loaded.

## Session flow

- The streamer panel stores the current session in `localStorage`
- The dashboard can also read `?session=...` from the URL
- The overlay uses the same session ID to receive the selected message

## Files of interest

- `index.html` - main site and streamer dashboard
- `extension/index.html` - OBS overlay renderer
- `streamer-app.js` - dashboard bootstrap, state sync, rendering, and overlay trigger
- `streamer-store.js` - persisted state and event normalization
- `streamer-view.js` - DOM rendering helpers for the streamer panel
- `streamer-utils.js` - shared formatters and payload helpers
- `extension/sources/youtube.js` - YouTube chat capture
- `extension/sources/twitch.js` - Twitch chat capture

## Notes

- `index.html` is the page you should open for the main site and dashboard
- The OBS overlay is under `extension/index.html`
- For testing, reload the extension and refresh the chat tabs after changing the code
- If PowerShell script execution is blocked, you may need to allow local scripts with your execution policy
- If you use the npm opener for the overlay, set `SESSION` as an environment variable or in `.env`

## Original project

This fork is based on the work of Steve Seguin and the original live chat overlay project.
