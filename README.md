# YTB Superchat

YTB Superchat e um projeto para centralizar chats de live em um dashboard de
streamer e publicar mensagens selecionadas em um overlay para OBS. O fluxo
principal combina uma extensao de captura no navegador, um portal estatico e um
backend Go responsavel por sessao, estado do overlay e broadcast em tempo real.

## O que o projeto faz

- captura mensagens de plataformas suportadas, com foco principal em YouTube e Twitch
- mostra os eventos em um dashboard do streamer
- permite selecionar mensagens para destaque no overlay
- entrega o overlay por URL para uso no OBS
- mantem estado local de interface no navegador e estado compartilhado no backend Go

## Arquitetura

- `src/` concentra o portal estatico, landing page e assets do overlay
- `extension/` contem a extensao Chrome usada para captura e bridge local
- `ytb-go/` contem o backend Go que atende API, WebSocket e rota do overlay

Fluxo resumido:

1. A extensao le o chat da plataforma suportada.
2. O dashboard recebe e organiza esses eventos no navegador.
3. O portal envia o estado selecionado para o backend Go.
4. O OBS consome a URL `/overlay?session=...` servida pelo backend.

## Estado atual

- dashboard principal funcionando em `/portal`
- overlay funcionando em `/overlay?session=...`
- backend Go servindo sessao, broadcast e keep-awake
- build web e pacote da extensao gerados pelo mesmo fluxo

## Como rodar localmente

Use Node.js para o portal e, em paralelo, o backend Go para API e overlay.

```bash
npm run dev
```

O portal local sobe por padrao em `http://localhost:8000`.

URLs uteis:

- `http://localhost:8000/` - landing local
- `http://localhost:8000/portal` - dashboard local
- `http://localhost:8000/overlay?session=YOUR_SESSION_ID` - overlay local
- `https://ytb.ericklucioh.com/` - deploy publico

## Variaveis de ambiente

Os exemplos versionados ficam na raiz:

- `.env.example`
- `.env.development.example`
- `.env.production.example`

Variaveis mais importantes:

- `PORT` - porta do portal estatico
- `YTB_GO_PORT` - porta do backend Go
- `YTB_OVERLAY_API_BASE_URL` - URL base da API do overlay
- `PUBLIC_BACKEND_URL` - URL publica usada pelo keep-awake
- `YTB_SESSION_ID` - sessao predefinida em desenvolvimento
- `YTB_PORTAL_MOCK` - ativa dados mockados para layout
- `YTB_DEBUG_LOGS` - habilita logs de diagnostico no portal
- `YTB_API_TOKEN` - token opcional para proteger API e WebSocket

## Build

```bash
npm run build
```

O build gera:

- `out/` com os assets do site
- `out/overlay/` com o overlay publicado
- `out/portal/overlay/` como alias de compatibilidade
- `out/chrome-extension.zip` com a extensao empacotada

## Extensao Chrome

Para desenvolvimento, carregue `extension/` como extensao unpacked:

1. Abra `chrome://extensions`
2. Ative o modo desenvolvedor
3. Clique em `Load unpacked`
4. Selecione a pasta `extension/`

## Documentacao complementar

- [`src/README.md`](src/README.md) - portal, dashboard e scripts
- [`extension/README.md`](extension/README.md) - extensao e bridge local
- [`ytb-go/README.md`](ytb-go/README.md) - backend Go

## Limitacoes atuais

- a extensao ainda concentra integracoes antigas alem do caminho principal
- o modelo atual de token ainda passa pelo cliente quando configurado
- o backend mantem estado em memoria, sem persistencia duravel

## Licenca

Este projeto esta publicado sob a licenca MIT. Veja [`LICENSE`](LICENSE).
