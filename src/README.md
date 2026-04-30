# Streamer Site

## Contexto
Esta pasta reúne o portal estático e o código compartilhado do site principal.

## Objetivo
Servir a interface do streamer, organizar os eventos do chat e disparar o overlay para o backend Go.

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

- manages the current bridge session ID
- manages a separate overlay API session ID
- shows Twitch subs, YouTube members, superchats, and live chat
- lets you filter messages by status
- lets you promote a message to the overlay by clicking it
- stores UI state in `localStorage`
- sends overlay events to the Go backend using the overlay API session

## O Que Existe Hoje
- Dashboard com filtros, cards e resumo
- Estado de UI salvo no navegador
- Bridge local de chat entre extensão e portal
- Envio de overlay para o backend Go

## O Que Precisa Ser Verdade
- O portal é estático
- O estado compartilhado não mora no front
- O `sessionId` do bridge conecta portal e extensão
- O overlay da API usa um `sessionId` separado, gerado no portal
- O OBS recebe apenas a URL desse overlay separado

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
The browser runtime gets its API URLs from `runtime-env.js`, which is generated from the current environment:

- `YTB_APP_ENV` - selects `development` or `production`
- `PORT` - static portal server port
- `YTB_GO_PORT` - Go backend port used to build the default API/WebSocket URLs
- `YTB_SESSION_ID` - default session loaded by the portal and overlay in dev
- `YTB_PORTAL_MOCK` - enables seeded mock cards for layout work
- `YTB_OVERLAY_API_BASE_URL` - explicit API base override
- `PUBLIC_BACKEND_URL` - explicit public backend URL used by keep-awake pings
- `YTB_PUBLIC_BACKEND_URL` - compatibility alias for the same public backend URL
- `YTB_OVERLAY_WS_URL` - explicit WebSocket override
- `YTB_API_TOKEN` - optional token forwarded to the portal/overlay runtime env and sent to the Go backend when configured
- `YTB_DEBUG_LOGS` - enables low-noise debug logging in the portal runtime

The portal also exposes a manual keep-awake control:

- The button calls `POST /keep-awake/start`.
- The backend keeps itself awake for 12 hours and pings `GET /health` every 7 minutes.
- `GET /keep-awake/status` can be used to refresh the visible state on load.

Use `.env.development.local` for local work and `.env.production.local` for production builds or CI.

When you run the Go backend separately, it now defaults to the source overlay:

- `YTB_GO_PORT=8080`
- `YTB_OVERLAY_DIR=src/overlay`

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

To start a preselected session:

```bash
YTB_SESSION_ID=ABC123 npm run dev
```

To open the portal in mock mode with seeded cards:

```bash
YTB_PORTAL_MOCK=1 npm run dev
```

You can also use `http://localhost:8000/portal?mock=1`.

Linux shell wrappers are also available under `src/scripts/*.sh` if you want to run the helpers directly.
The Windows `.ps1` wrappers use the same `src/scripts/open.mjs` URL builder, so session encoding stays consistent.

To turn on portal debug logs locally:

```bash
YTB_DEBUG_LOGS=1 npm run dev
```

## Build

```bash
npm run build
```

This copies the site into `out/`, publishes the overlay under `out/overlay/` and `out/portal/overlay/`, and also packages the extension zip.
Only the allowlisted portal assets are copied, and the legacy `/src/index.html` redirect entry is regenerated for compatibility.

## Critério De Pronto
- Portal abre em `/portal`
- Overlay abre em `/overlay?session=...`
- Estado local do front não confunde sessão compartilhada
- A seleção de mensagem produz overlay no backend

## Session flow

The dashboard accepts a session in a few ways:

- Bridge session:
  - URL parameter `?session=...`
  - URL parameter `?s=...`
  - `localStorage`
  - Chrome extension storage when the extension is installed
- Overlay API session:
  - generated in the portal
  - persisted separately from the bridge session
  - shown in the visible session field
- The `Conectar` button creates a fresh bridge session without touching the overlay session

## Notes

- Superchat conversion is used internally for ordering and totals in the dashboard.
- The OBS overlay keeps the original currency display.
- The site does not capture chat on its own. It consumes events coming from the Chrome extension bridge and publishes overlay updates to the Go backend.
- `/src/index.html` is kept as a temporary redirect to `/portal` for compatibility.

## Assunções
- O portal continua estático.
- O backend Go continua sendo o ponto de verdade para overlay e sessão.
- O visual atual é a referência de compatibilidade.
