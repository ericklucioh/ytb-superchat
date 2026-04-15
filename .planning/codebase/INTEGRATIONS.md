# External Integrations

**Analysis Date:** 2024-04-14

## APIs & External Services

**Streaming Platforms (Chat Capture):**
- YouTube - Captured via `extension/sources/youtube.js` (DOM scraping + local chat bridge).
- Twitch - Captured via `extension/sources/twitch.js` (DOM scraping + local chat bridge).
- Kick - Captured via `extension/sources/kick.js`.
- Instagram / InstaLive - Captured via `extension/sources/instagram.js`, `extension/sources/instalive.js`.
- Other supported platforms: Facebook, Twitter, Trovo, Glimesh, Mobcrush, Crowdcast.

**External Interaction Tools:**
- Slido - Captured via `extension/sources/slido.js`.
- PollEverywhere - Captured via `extension/sources/polleverywhere.js`.
- Zoom - Captured via `extension/sources/zoom.js`.
- Restream - Captured via `extension/sources/restream.js`.

## Data Storage

**Databases:**
- None detected - Data persists only in session or extension storage.

**File Storage:**
- Local filesystem only - Used for build assets.

**Caching:**
- Chrome Sync Storage - Used for storing user settings (`extension/settings/options.js`).
- Session Storage - Used for keeping room/session IDs on the dashboard (`src/site/streamer-app.js`).

## Authentication & Identity

**Auth Provider:**
- Custom Session/Room IDs - Used to link the dashboard with the extension relay.
- Implementation: Users enter or generate a "Session ID" to pair their dashboard with the extension capture scripts.

## Monitoring & Observability

**Error Tracking:**
- None detected - Uses standard browser console logging.

**Logs:**
- Browser Console - Logging is used throughout the extension scripts and frontend.

## CI/CD & Deployment

**Hosting:**
- `ytb.ericklucioh.com` - Likely hosted on GitHub Pages or a similar static hosting provider.

**CI Pipeline:**
- GitHub Actions - `.github/workflows/deploy.yml` handles automated deployment.

## Environment Configuration

**Required env vars:**
- None critical - The project is primarily client-side.

**Secrets location:**
- Not applicable - No server-side secrets or API keys detected.

## Webhooks & Callbacks

**Incoming:**
- None detected.

**Outgoing:**
- None detected.

---

*Integration audit: 2024-04-14*
