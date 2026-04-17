# Chrome Extension

## Contexto
A extensão captura mensagens de chat de várias plataformas e entrega os eventos ao portal.

## Objetivo
Manter a extensão como camada de captura e bridge, sem assumir responsabilidade de renderização do overlay.

This folder contains the browser extension only.

## What lives here

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

## O Que Existe Hoje
- Scripts de captura por plataforma
- Bridge local para envio de eventos
- Overlay legado ainda presente como asset histórico
- Integração com o portal já funcionando no caminho principal

## Main scripts

- [`sources/shared-runtime.js`](sources/shared-runtime.js) - shared socket, settings, and helper runtime
- [`sources/local-chat-bridge.js`](sources/local-chat-bridge.js) - local Port-based bridge for chat ingestion
- [`sources/dashboard-relay.js`](sources/dashboard-relay.js) - forwards chat events from the extension into the dashboard page
- [`sources/avatar-helpers.js`](sources/avatar-helpers.js) - shared avatar lookup helpers for supported platforms
- [`sources/youtube.js`](sources/youtube.js) - YouTube chat capture
- [`sources/twitch.js`](sources/twitch.js) - Twitch chat capture
- [`settings/options.html`](settings/options.html) - extension settings UI

## O Que Precisa Mudar
- O renderer do overlay não mora mais na extensão.
- O OBS consome o overlay servido pelo portal/backend Go.
- A extensão fica só na captura e bridge.

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
- The dashboard receives chat events through the extension bridge and publishes overlay updates to the Go backend.

## Critério De Pronto
- A extensão captura mensagens sem ser dona do overlay
- O caminho principal não aponta para serviço externo
- O overlay não existe mais como página da extensão

## Assunções
- A extensão ainda existe para capturar chat em pop-up.
- O renderer do overlay vive no portal/backend Go.
