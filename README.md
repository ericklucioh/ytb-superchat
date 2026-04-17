# YTB Superchat

## Contexto
Este repositório reúne portal, extensão e backend Go para centralizar chats de lives e exibir mensagens no OBS.

## Objetivo
Permitir que o streamer acompanhe chats de várias plataformas, selecione mensagens no portal e envie o conteúdo ao overlay servido pelo backend.

## Estrutura
- `src/` - portal estático e site local
- `extension/` - extensão Chrome e assets legados do overlay
- `ytb-go/` - backend Go local para sessão e broadcast do overlay

## What this project does

- Captures Twitch, YouTube e outras fontes suportadas
- Mostra mensagens em um dashboard para o streamer
- Envia mensagens selecionadas ao overlay do OBS
- Persiste estado local de UI no navegador
- Suporta superchats, subs, members e chat normal

## Project Structure

- [`README.md`](README.md) - visão geral do projeto
- [`src/README.md`](src/README.md) - portal e site local
- [`extension/README.md`](extension/README.md) - extensão e overlay legado
- [`ytb-go/README.md`](ytb-go/README.md) - backend Go local

## O Que Já Funciona
- Portal com dashboard principal em `/portal`
- Overlay consumido por `/overlay?session=...`
- Captura por extensão em várias plataformas
- Backend Go servindo sessão e broadcast

## Run locally

```bash
npm run dev
```

O servidor local padrão é `http://localhost:8000`.

Useful URLs:

- `https://ytb.ericklucioh.com/` - landing page
- `https://ytb.ericklucioh.com/portal` - main streamer dashboard
- `http://localhost:8000/` - local landing page
- `http://localhost:8000/portal` - local dashboard
- `http://localhost:8000/overlay?session=YOUR_SESSION_ID` - local OBS overlay

## Build

```bash
npm run build
```

Isto gera:

- `out/` - static site build
- `out/portal/overlay/` - overlay assets published by the portal build
- `out/chrome-extension.zip` - packaged Chrome extension

## Chrome extension

Carregue `extension/` como unpacked no Chrome enquanto desenvolve:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `extension/` folder

## Session flow

- O dashboard guarda o `sessionId` atual em `localStorage`
- O dashboard também lê `?session=...` da URL
- A extensão usa o mesmo `sessionId` para mandar chat ao portal
- O backend Go armazena o overlay por sessão e serve o browser source do OBS

## Papel De Cada Parte
- Portal:
  - interface do streamer
  - seleção de mensagens
  - controle do overlay
- Extensão:
  - captura e normalização
  - bridge para o portal
- Backend Go:
  - sessão
  - overlay
  - broadcast em tempo real
- OBS:
  - somente consumo do overlay

## Main files

- [`src/landing.html`](src/landing.html) - landing page for the site root
- [`src/index.html`](src/index.html) - streamer dashboard entry point used by `/portal`
- [`src/site/streamer-app.js`](src/site/streamer-app.js) - dashboard bootstrap and local bridge flow
- [`src/site/streamer-store.js`](src/site/streamer-store.js) - persisted state and normalization
- [`src/site/streamer-view.js`](src/site/streamer-view.js) - UI rendering helpers
- [`src/site/streamer-text.js`](src/site/streamer-text.js) - shared text, parsing, and normalization helpers
- [`src/site/streamer-currency.js`](src/site/streamer-currency.js) - currency parsing and formatting
- [`src/site/streamer-events.js`](src/site/streamer-events.js) - event normalization, payload building, and comparisons
- [`src/site/streamer-rates.js`](src/site/streamer-rates.js) - BRL conversion and rate caching
- [`src/site/streamer-utils.js`](src/site/streamer-utils.js) - compatibility re-export for shared helpers
- [`extension/index.html`](extension/index.html) - legacy overlay renderer
- [`extension/sources/youtube.js`](extension/sources/youtube.js) - YouTube chat capture
- [`extension/sources/twitch.js`](extension/sources/twitch.js) - Twitch chat capture

## Notes

- O overlay é servido pelo caminho do portal/backend.
- Se mudar a extensão, rebuild e recarregue a extensão.
- Se mudar o dashboard, atualize a página local.
- `out/` é só artefato gerado, nunca origem.

## Origin

This project is based on the original live chat overlay work by Steve Seguin, with a streamer dashboard and Twitch/YouTube workflow layered on top.
