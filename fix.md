Posso preparar o conteúdo completo do arquivo, mas neste turno não posso gravar no repositório porque ainda estamos em Plan Mode.

Sugestão de arquivo: `docs/relatorio-memoria-portal.md`

Conteúdo completo:

```md
# Relatório de memória e estado do portal

## Objetivo

Este documento explica, de forma prática, o que o portal guarda em `localStorage`, o que fica em memória enquanto a aba está aberta, e por que o navegador pode ficar pesado com o tempo.

A ideia é separar claramente:

- o que é persistido
- o que é temporário
- o que cresce com o uso
- o que é limpo só com reload da página

---

## Visão geral do portal

O portal é a interface principal do streamer. Ele:

- recebe eventos da extensão
- salva histórico local
- renderiza listas de mensagens e eventos
- mantém uma sessão do bridge
- mantém uma sessão separada do overlay da API
- envia eventos selecionados para o backend do overlay

Os principais arquivos envolvidos são:

- `src/site/streamer-app.js`
- `src/site/streamer-store.js`
- `src/site/streamer-view.js`
- `src/site/streamer-events.js`
- `src/site/chat-bridge.js`

---

## O que fica em localStorage

`localStorage` é persistente. Ele continua existindo depois de fechar a aba, fechar o navegador e abrir de novo, até ser removido manualmente ou sobrescrito.

No portal, os dados mais importantes salvos em `localStorage` são:

- histórico do portal
- room/session do bridge
- overlay session ID
- algumas preferências ou estados auxiliares

### Chaves principais

Pelo código atual, as chaves mais relevantes são:

- `overlay_state`
- `overlay_room_id`
- `overlay_api_session_id`
- possíveis chaves antigas de migração do estado

---

## `overlay_state`

Essa é a principal estrutura persistida do portal.

Ela é criada e atualizada em `src/site/streamer-store.js`.

### Forma geral

```js
{
  version: 1,
  filter: "active" | "read" | "favorite" | "all",
  roomId: "session-da-extensao",
  overlayId: "id-do-evento-selecionado",
  events: [
    {
      id: "evento-1",
      platform: "twitch",
      type: "message" | "sub" | "member" | "superchat",
      user: "nome do usuário",
      timestamp: 1234567890,
      status: "active" | "read" | "favorite",
      message: "texto",
      chatimg: "...",
      chatbadges: "...",
      backgroundColor: "...",
      textColor: "...",
      hasDonation: "...",
      hasMembership: "...",
      currency: "BRL",
      amount: 10,
      tier: 1,
      months: 3,
      giftCount: 5,
      dedupeKey: "..."
    }
  ]
}
```

### O que isso significa na prática

- `filter` salva qual aba/filtro estava ativo.
- `roomId` salva a sessão atual do bridge.
- `overlayId` salva a mensagem/evento atualmente selecionado para o overlay.
- `events` salva o histórico principal.

### O ponto crítico

O `events` não é limitado como um “buffer curto”.

No código atual:

- mensagens `message` vão para `liveEvents`, que tem limite
- eventos `sub`, `member` e `superchat` vão para `state.events`
- `state.events` cresce sem limite prático enquanto a live continua

Isso é importante porque o portal não está guardando apenas “últimas mensagens”.
Ele está guardando um histórico cada vez maior.

---

## `overlay_room_id`

Essa chave salva a sessão do bridge.

Ela é usada para manter o portal e a extensão sincronizados.

Exemplo:

```js
localStorage.setItem("overlay_room_id", "ABC123");
```

### Para que serve

- ligar o portal à extensão
- reabrir o portal já na mesma sessão
- manter o bridge estável entre reloads

### O que ela não faz

- não guarda o histórico do chat
- não controla o overlay visual
- não limita memória

---

## `overlay_api_session_id`

Essa chave guarda a sessão separada do overlay/API.

Ela não é a mesma sessão do bridge.

Exemplo:

```js
localStorage.setItem("overlay_api_session_id", "XYZ999");
```

### Para que serve

- criar um ID separado para o overlay consumido pelo OBS/backend
- permitir que o portal mande eventos para o backend sem confundir com a sessão do chat

### Separação importante

- `overlay_room_id` = sessão do bridge/extensão
- `overlay_api_session_id` = sessão do overlay/API

---

## O que fica em memória

Memória aqui significa tudo que existe enquanto a aba está aberta e o JavaScript continua vivo.

Isso inclui:

- objetos JavaScript
- listas em arrays
- mapas e sets
- nós do DOM
- observadores
- timers
- listeners de eventos
- caches internos

Quando você dá `Ctrl+F5`, essa memória é descartada porque a página é reiniciada.

---

## Estruturas em memória no portal

### 1. `state.events`

É o histórico principal do portal.

Fica em memória e também é persistido em `localStorage`.

Exemplo:

```js
state.events.push(event);
```

Esse é o crescimento mais importante do portal.

Se a live durar muito e entrar muito `superchat`, `member` e `sub`, esse array vai ficando maior.

---

### 2. `liveEvents`

É a lista de mensagens ao vivo.

Exemplo:

```js
liveEvents.unshift(event);
```

Essa lista é limitada por:

```js
maxLiveMessages
```

No código, o limite padrão é 500.

```js
if (liveEvents.length > maxLiveMessages) {
  liveEvents.length = maxLiveMessages;
}
```

Então:

- `liveEvents` não cresce sem limite
- `state.events` sim

---

### 3. `recentEventKeys`

É um `Map` usado para deduplicação por TTL.

Exemplo:

```js
const recentEventKeys = new Map();
```

Ele evita inserir eventos repetidos durante um período.

```js
recentEventKeys.set(event.dedupeKey, now);
```

Esse `Map` é limpo com o tempo:

```js
if (now - seenAt > DEDUPE_TTL_MS) {
  recentEventKeys.delete(key);
}
```

Então ele tem crescimento controlado, não infinito.

---

### 4. `collectionState` da view

Em `src/site/streamer-view.js`, existe um `WeakMap` que guarda estado de render por container.

Exemplo:

```js
const collectionState = new WeakMap();
```

Esse estado inclui:

- `items`: um `Map` com nós renderizados
- `emptyNode`: o nó de estado vazio

O problema aqui é que o `Map` de itens acompanha o histórico visível.

Se o histórico cresce, a view precisa rastrear mais elementos.

---

### 5. Nós do DOM dos cards

A renderização cria e mantém elementos na árvore da página.

Cada item salvo pode virar:

- um card de prioridade
- um card de superchat
- um card de mensagem ao vivo

Exemplo de criação:

```js
const template = elements.eventTemplate.content.cloneNode(true);
```

Exemplo de cache de nó:

```js
state.items.set(event.id, { node });
```

Esses nós ficam vivos enquanto o evento continuar renderizado.

---

### 6. `renderToken`

É um contador simples para evitar corrida de render.

Exemplo:

```js
renderToken += 1;
const token = renderToken;
```

Isso não cresce de forma problemática, mas existe em memória.

---

### 7. `currencyRates` e `pendingCurrencyRates`

No serviço de moedas:

```js
const currencyRates = new Map();
const pendingCurrencyRates = new Map();
```

Esse cache é pequeno e normalmente não é o culpado principal.

Ele só guarda moedas diferentes usadas nos superchats.

---

### 8. `chatBridge` listeners

Em `src/site/chat-bridge.js` existe:

```js
const listeners = new Set();
```

Esses listeners ficam vivos enquanto o bridge estiver ativo.

Eles são removidos no `close()`:

```js
listeners.clear();
```

Então isso não deve crescer indefinidamente se o fluxo estiver correto.

---

### 9. `portalLogger` e logs

O logger em si não armazena histórico em memória, ele só envia para `console`.

Exemplo:

```js
portalLogger.debug("incoming-payload", summarizePayload(normalized));
```

Por padrão isso não é o maior peso.
Mas se o debug estiver ligado, o console pode ficar mais caro de manter.

---

## O que cresce de verdade

O maior crescimento esperado no portal é este:

### Crescimento 1: histórico persistido

```js
state.events
```

Cresce com:

- `sub`
- `member`
- `superchat`

Isso é persistido em `localStorage`.

### Crescimento 2: renderização desse histórico

A view cria e mantém DOM para itens históricos.

Quanto mais eventos, mais nós, mais trabalho de render, mais custo de atualização.

### Crescimento 3: listas filtradas e ordenadas em cada render

A cada render, o portal recalcula:

```js
const visibleEvents = store.getVisibleEvents();
const priorityEvents = visibleEvents.filter(...).sort(...);
const superchatEvents = visibleEvents.filter(...).map(...).sort(...);
const chatEvents = store.liveEvents.slice().sort(...);
```

Isso significa que o custo da renderização aumenta com o volume total.

---

## O que não cresce sem limite

### `liveEvents`

Tem limite explícito.

### `recentEventKeys`

Tem TTL de 10 minutos.

### `currencyRates`

Só cresce conforme novas moedas aparecem.

### `pendingCurrencyRates`

Só cresce enquanto há requisições pendentes.

### `renderToken`

É apenas um contador.

---

## Por que `Ctrl+F5` ajuda

Quando você dá `Ctrl+F5` no portal:

- a página é destruída
- o JavaScript é reiniciado
- o DOM antigo é perdido
- `state.events` e `liveEvents` em memória somem
- os listeners são recriados
- os observers são recriados
- o layout volta limpo

Se a aba estava pesada, isso dá a sensação de “limpeza”.

Mas é um reset, não uma solução.

---

## Exemplo prático do que acontece com o tempo

### Cenário 1: chat normal

```js
message -> liveEvents
message -> liveEvents
message -> liveEvents
```

Isso cresce, mas é limitado.

### Cenário 2: vários subs e superchats

```js
sub -> state.events
member -> state.events
superchat -> state.events
sub -> state.events
superchat -> state.events
```

Isso cresce sem limite prático.

### Cenário 3: longa duração

```js
state.events.length === 1000
state.events.length === 5000
state.events.length === 12000
```

Nesse ponto:

- o `localStorage` fica grande
- o `JSON.stringify` fica caro
- o render fica mais pesado
- a navegação interna da aba fica mais lenta
- o browser pode começar a engasgar

---

## Exemplo do que é salvo no `localStorage`

```js
localStorage.setItem("overlay_state", JSON.stringify({
  version: 1,
  filter: "active",
  roomId: "ROOM123",
  overlayId: "evt_abc",
  events: [
    {
      id: "twitch:123",
      platform: "twitch",
      type: "sub",
      user: "Fulano",
      timestamp: 1710000000000,
      status: "active",
      message: "resubscribed for 3 months",
      months: 3
    }
  ]
}));
```

Esse conteúdo fica salvo entre reloads.

---

## Exemplo do que fica só em memória

```js
const liveEvents = [
  {
    id: "twitch:live-1",
    platform: "twitch",
    type: "message",
    user: "Ciclano",
    timestamp: 1710000000000,
    message: "oi"
  }
];
```

Isso some quando a aba recarrega.

---

## Exemplo de diferença entre persistência e memória

### Persistido

```js
state.events.push(event);
persistState();
```

### Só memória

```js
liveEvents.unshift(event);
enforceLiveLimit();
```

Isso é a forma mais simples de pensar no sistema:

- `state.events` = histórico persistente
- `liveEvents` = fila temporária

---

## Onde o portal realmente pesa

Os pontos mais pesados são:

1. histórico sem limite em `state.events`
2. re-render do histórico inteiro
3. criação/manutenção de nós DOM para listas grandes
4. serialização do estado inteiro para `localStorage`
5. custo de `filter + sort + map` em listas grandes

---

## Relação com a extensão

A extensão também tem memória, mas o sintoma que você descreveu no portal é compatível com:

- portal acumulando histórico
- portal acumulando nós
- portal acumulando custo de render
- reload limpando tudo

A extensão pode contribuir com:

- observers presos ao DOM do chat
- filas de bridge
- backlog persistido

Mas o `Ctrl+F5` no portal limpa principalmente o estado do portal e os scripts que rodam nessa aba.

---

## Como identificar o que está acontecendo na prática

### Se o problema for no portal

Você vai ver:

- número de eventos crescendo
- aba ficando lenta mesmo sem mexer na extensão
- render demorando mais
- `localStorage` maior
- memória da aba do portal subindo

### Se o problema for no chat da plataforma

Você vai ver:

- a captura para de emitir mensagens
- a extensão fica sem novos eventos
- o portal até pode continuar leve, mas sem receber dados
- recarregar só o portal talvez ajude por reanexar o bridge, não por reduzir o chat externo

### Se o problema for os dois

Você vai ver:

- portal pesado
- extensão perdida do DOM do chat
- mensagens parando
- reload do portal “resolve” porque força religação e limpeza de estado

---

## Resumo final

No portal:

- `localStorage` guarda o histórico principal e sessões
- memória guarda listas, caches, nós DOM e estado de render
- o histórico de `sub/member/superchat` cresce sem limite relevante
- `liveEvents` é limitado
- o reload limpa tudo porque recria a aba

Se o objetivo é evitar que o portal pese, a correção real não é só limpar.
É limitar o histórico, arquivar o que não precisa ficar vivo e reduzir o custo do render.

---

## Próxima análise recomendada

Se quiser diagnosticar com precisão, os próximos passos técnicos são:

- medir quantos eventos existem em `state.events`
- medir o tamanho real do `localStorage`
- comparar memória antes/depois de `Ctrl+F5`
- confirmar se o gargalo está em DOM, histórico ou bridge
- decidir uma política de retenção:
  - manter só N eventos
  - arquivar por tempo
  - limpar por status
  - separar histórico ativo de histórico morto
```

Se você quiser, no próximo passo eu posso transformar isso em um relatório mais curto e mais executivo, ou em um plano de correção técnica com prioridade por impacto.



› tido tudo isso q vimos, oq podemos fazer, sem estragar a ferramenta


• Sim. O caminho mais seguro é não mexer no fluxo principal de captura, e sim cortar o peso onde ele cresce sem precisar refazer a ferramenta.

  Eu faria nesta ordem:

  ### 1. Parar de manter histórico infinito no portal

  Esse é o ajuste de maior impacto e menor risco.

  Hoje:

  - liveEvents já é limitado
  - state.events não é

  O que fazer:

  - manter só uma janela ativa, por exemplo os últimos N eventos por tipo
  - ou separar “ativos na UI” de “arquivados”
  - ou arquivar por tempo, ex.: últimos 30 ou 60 minutos

  Isso evita que a aba fique cada vez mais cara sem destruir a experiência.

  Arquivos envolvidos:

  - src/site/streamer-store.js
  - src/site/streamer-app.js

  ### 2. Parar de recalcular tudo a cada evento

  Hoje o render faz isso:

  - filtra histórico inteiro
  - ordena histórico inteiro
  - mapeia superchats para cópias decoradas
  - atualiza DOM

  O que fazer:

  - recalcular só o que mudou
  - ou manter listas derivadas já prontas
  - ou fazer render incremental por tipo

  Essa mudança reduz CPU sem mexer na captura.

  Arquivo:

  - src/site/streamer-app.js

  ### 3. Decorar superchat só uma vez

  Hoje cada render cria cópias novas com:

  {
    ...event,
    currencyRate,
    brlAmount,
    sortBrlAmount
  }

  Isso gera churn desnecessário.

  O que fazer:

  - calcular esses campos na normalização ou na inserção
  - guardar o resultado no evento original
  - evitar map() criando cópia nova toda vez

  Arquivos:

  - src/site/streamer-rates.js
  - src/site/streamer-events.js

  ### 4. Debounce mais forte do persist e do render

  Mesmo que localStorage não seja o vilão principal, gravar JSON grande toda hora custa CPU.

  O que fazer:

  - persistir em lote, não em toda mutação
  - renderizar em lote com mais agressividade
  - evitar várias renderizações seguidas no mesmo ciclo

  Arquivo:

  - src/site/streamer-store.js
  - src/site/streamer-app.js

  ### 5. Criar um modo de “janela ativa”

  Essa é a solução mais segura para não quebrar a ferramenta.

  Ideia:

  - o painel mostra só o que está recente e relevante
  - o restante vai para resumo/contagem
  - o usuário não perde a ferramenta, só para de carregar tudo para a UI

  Exemplo:

  - chat ao vivo: últimos 500
  - superchats: últimos 100 ou últimos 60 minutos
  - subs/members: últimos 100 ou arquivar por sessão

  ### 6. Medir antes de mexer fundo

  Antes de fazer uma refatoração maior, eu colocaria métricas simples:

  - tempo do render()
  - tamanho de state.events
  - tamanho do DOM em cada lista
  - quantidade de objetos por tipo

  Assim a gente confirma qual corte deu mais ganho.

  ———

  ## O que eu evitaria agora

  Para não estragar a ferramenta, eu evitaria:

  - reescrever o bridge da extensão
  - mexer no formato do payload da extensão
  - mexer no DOM da captura da Twitch/YouTube
  - trocar tudo por virtualização pesada logo de cara

  Essas mudanças têm mais chance de quebrar o fluxo.

  ———

  ## Resposta curta

  1. limitar o histórico persistido
  2. parar de recalcular tudo em todo render
  3. parar de criar cópias novas de superchat a cada render
  4. debounced persist/render
  5. manter o fluxo de captura da extensão intacto

  Se você quiser, eu posso transformar isso em um plano de implementação conservador, com mudanças pequenas e ordem exata de execução.


› sim, crie esse plano


• <proposed_plan>

  # Plano Conservador Para Reduzir RAM e Lerdeza do Portal

  ## Summary

  Aplicar uma correção de baixo risco no portal para parar o crescimento desnecessário de memória e reduzir o custo de processamento sem mexer no
  fluxo de captura da extensão. A estratégia é preservar a ferramenta e atacar apenas o que cresce sem limite: histórico persistido, recomputação em
  render e cópias temporárias evitáveis.

  ## Key Changes

  - Limitar o histórico ativo do portal em state.events com uma janela prática por tipo ou por tempo, mantendo a experiência útil sem carregar a
    vida inteira da live na RAM.
  - Separar histórico “ativo na UI” de histórico arquivado, para que o painel continue funcional sem reprocessar tudo o tempo todo.
  - Parar de recriar cópias de superchat a cada render; calcular campos derivados uma vez na entrada ou na inserção do evento.
  - Reduzir o custo de render() evitando filtros/ordenações completos em todo evento quando o estado visível não mudou.
  - Tornar persistência e render mais agressivamente em lote, para evitar várias atualizações caras em sequência.
  - Manter intocado o payload da extensão e o bridge de captura, para não quebrar Twitch/YouTube nem o formato de integração atual.

  ## Test Plan

  - Validar que o chat ao vivo continua limitado e que itens antigos saem do DOM corretamente.
  - Validar que superchats, subs e members continuam aparecendo e sendo selecionáveis no portal.
  - Medir antes/depois:
      - tamanho de state.events
      - tempo de render()
      - quantidade de nós no DOM das listas principais
      - uso de RAM após sessão longa
  - Rodar uma sessão longa com volume artificial de mensagens para confirmar que o portal não continua degradando indefinidamente.
  - Confirmar que Ctrl+F5 deixa de ser necessário para recuperar performance no uso normal.

  ## Assumptions

  - O fluxo de captura da extensão não será alterado nesta etapa.
  - O formato do payload entre extensão e portal continuará compatível com o que existe hoje.
  - O objetivo é reduzir RAM e lerdeza sem redesenhar a arquitetura inteira.
  - O comportamento esperado é manter a ferramenta operacional durante lives longas, mesmo que o histórico antigo passe a ser resumido ou arquivado.
    </proposed_plan>