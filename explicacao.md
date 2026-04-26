Li o fluxo inteiro. Aqui está o caminho real, em ordem, do chat no YouTube/Twitch até o portal.

**1. O portal escolhe a sessão**
- O ponto de entrada é [`/home/erick/code/projs/ytb-superchat/src/site/streamer-app.js`](file:///home/erick/code/projs/ytb-superchat/src/site/streamer-app.js).
- No boot ele decide a sala atual por:
  - `session` da URL
  - `window.__YTB_ENV__`
  - `localStorage`
  - ou `chrome.storage.sync.streamID`
- O botão `Gerar ID` só gera um ID novo e preenche o campo.
- O botão `Conectar` chama `connect(roomId)`.

**2. `connect(roomId)` vira a fonte da sessão**
- Ainda em [`src/site/streamer-app.js`](file:///home/erick/code/projs/ytb-superchat/src/site/streamer-app.js):
  - salva a sala no `store`
  - grava em `localStorage`
  - escreve `streamID` em `chrome.storage.sync`
  - atualiza o campo na tela
  - chama `chatBridge.setSession(nextRoom)` ou `refreshSession(nextRoom)`
- Isso faz o portal ser o dono da sessão.
- Depois da limpeza que fizemos, as fontes não devem mais competir por `streamID`.

**3. O portal fala com a ponte local**
- O contrato do portal está em [`/home/erick/code/projs/ytb-superchat/src/site/chat-bridge.js`](file:///home/erick/code/projs/ytb-superchat/src/site/chat-bridge.js).
- Ele usa `window.postMessage` para mandar para a página:
  - `overlay-local-chat:set-session`
  - `overlay-local-chat:page-ready`
  - `overlay-local-chat:refresh-session`
- E ele escuta:
  - `overlay-local-chat:event`
  - `overlay-local-chat:relay-ready`
- Ou seja, o portal não fala direto com a aba do YouTube/Twitch. Ele fala com a relay da extensão.

**4. A relay do dashboard recebe a sessão**
- O arquivo é [`/home/erick/code/projs/ytb-superchat/extension/sources/dashboard-relay.js`](file:///home/erick/code/projs/ytb-superchat/extension/sources/dashboard-relay.js).
- Ela roda na página do portal e faz três coisas:
  - lê a sessão inicial da URL / `localStorage` / `chrome.storage.sync`
  - abre um canal da bridge com `OverlayLocalChatBridge.createChannel({ role: "dashboard", session })`
  - repassa eventos da bridge para a página do portal via `window.postMessage`
- Antes, ela também espelhava sessão de volta para `chrome.storage.sync`.
- Agora isso foi removido, para evitar disputa de ownership.

**5. As fontes YouTube/Twitch só seguem a sessão**
- Os arquivos são:
  - [`/home/erick/code/projs/ytb-superchat/extension/sources/youtube.js`](file:///home/erick/code/projs/ytb-superchat/extension/sources/youtube.js)
  - [`/home/erick/code/projs/ytb-superchat/extension/sources/twitch.js`](file:///home/erick/code/projs/ytb-superchat/extension/sources/twitch.js)
- O padrão é:
  - carregam `item.streamID` se já existir
  - se o portal mudar `streamID`, `runtime.watchStreamId(syncSession)` chama `syncSession(...)`
  - `syncSession` atualiza `channel`
  - `ensureLocalBridge()` cria o canal local com essa sessão
- Elas não deveriam mais gerar sessão própria nem escrever `streamID` no sync.

**6. Captura do chat**
- **YouTube**
  - usa `MutationObserver` para pegar novos nós do chat
  - `sendYoutubeFeed(element)` extrai nome, mensagem, avatar, badge, membership, superchat
  - monta um objeto `data`
  - chama `pushFeedMessage(data)`
  - só marca `element.dataset.feedSent = "1"` se o envio realmente funcionou
- **Twitch**
  - usa `MutationObserver` + sweep de fallback
  - `extractTwitchMessageData()` monta o payload
  - `sendTwitchFeed()` chama `pushFeedMessage(data)`
  - também só marca como enviado depois do envio

**7. A ponte local da fonte**
- O arquivo é [`/home/erick/code/projs/ytb-superchat/extension/sources/local-chat-bridge.js`](file:///home/erick/code/projs/ytb-superchat/extension/sources/local-chat-bridge.js).
- Ela é a peça mais importante entre captura e backend.
- Função prática:
  - cria um port `chrome.runtime.connect({ name: "chat-bridge:source:<session>" })`
  - mantém fila persistente em `chrome.storage.local`
  - manda `heartbeat`
  - espera `ack`
  - reconecta se o port cair
- Quando a fonte chama `pushFeedMessage(data)`:
  - o pacote entra na fila pendente
  - a bridge tenta mandar para o `service_worker`
  - se a rede interna falhar, ele persiste e tenta de novo depois

**8. O `service_worker` recebe e valida**
- O arquivo é [`/home/erick/code/projs/ytb-superchat/extension/service_worker.js`](file:///home/erick/code/projs/ytb-superchat/extension/service_worker.js).
- Ele separa os ports por sessão e por papel:
  - `source`
  - `dashboard`
- Quando recebe de uma fonte:
  - valida o pacote
  - ignora o que não é `publish`
  - deduplica por `packetKey`
  - guarda backlog em `chrome.storage.session`
  - manda `ack` para a fonte
  - reenvia `publish` para os dashboards daquela sessão
- Quando recebe de dashboard:
  - reidrata backlog
  - manda `ready`
  - reenvia histórico pendente

**9. O portal recebe o chat**
- O portal escuta os eventos da relay via [`/home/erick/code/projs/ytb-superchat/src/site/chat-bridge.js`](file:///home/erick/code/projs/ytb-superchat/src/site/chat-bridge.js).
- Em [`/home/erick/code/projs/ytb-superchat/src/site/streamer-app.js`](file:///home/erick/code/projs/ytb-superchat/src/site/streamer-app.js):
  - `handleIncomingPayload(payload)` normaliza o evento
  - `store.insertEvent(normalized)` salva no store local
  - `scheduleRender()` manda renderizar a UI
- A UI lê do store, não do backend.

**10. O portal salva e renderiza**
- O estado do portal fica em memória e em `localStorage` via o store.
- O fluxo é:
  - receber payload
  - normalizar
  - inserir no store
  - calcular contagens
  - renderizar listas
- O backend Go não é o “banco” do portal.
- O “db operacional” aqui é o store/localStorage do portal, como você comentou.

**11. Se você clica no overlay**
- O portal monta o payload para o backend com `sendOverlayPacket(...)` em [`src/site/streamer-app.js`](file:///home/erick/code/projs/ytb-superchat/src/site/streamer-app.js).
- Isso faz `POST /api/event` para o backend Go.
- O token vai em `X-YTB-Token` quando existe.
- Esse passo é separado da captura do chat.

**12. O caminho de volta do overlay**
- O overlay do backend usa o Go para receber e reemitir pelo WS.
- O portal copia a URL do overlay com `session=` em `copyOverlayLink()`.

**13. Onde existe checagem**
- **Na fonte**
  - se não houver sessão, a bridge não sobe
  - `pushFeedMessage()` retorna `false`
  - `feedSent` só é marcado se o envio foi aceito
- **Na bridge local**
  - fila persistente
  - `ack`
  - `heartbeat`
  - reconnect
- **No service worker**
  - ignora pacote inválido
  - deduplica
  - persiste backlog
- **No portal**
  - normaliza payload antes de inserir
  - renderiza só o que foi aceito

**Resumo mental curto**
- O portal escolhe a sala.
- As fontes seguem essa sala.
- As fontes capturam o chat.
- A bridge local guarda e retransmite.
- O `service_worker` valida e distribui.
- O portal recebe, salva e renderiza.

**Sobre o erro do console**
- Esse caminho do código não usa `runtime.sendMessage`.
- Então o `Receiving end does not exist` que você viu no popup do YouTube provavelmente não é desse pipeline principal.
- O nosso fluxo usa `chrome.runtime.connect` com `port`, mais `window.postMessage` entre portal e relay.

Se você quiser, eu posso fazer a próxima etapa e te dar esse mesmo fluxo em formato de **sequência numerada de evento por evento**, tipo:
`clicou conectar -> escreveu streamID -> watchStreamId -> syncSession -> createChannel -> connect -> publish -> ack -> render`. 