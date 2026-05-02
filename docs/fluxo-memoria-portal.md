                                      # Fluxo de Memória do Portal

## Objetivo

Este documento explica como um evento entra no portal, o que fica salvo em `localStorage`, o que fica em memória enquanto a aba está aberta e onde o processamento pode ficar lento com o tempo.

A ideia aqui é separar quatro coisas que normalmente se confundem:

- objeto persistido
- cópia temporária criada para render
- nó de DOM vivo
- histórico acumulado que cresce sem limite útil

## Visão Geral

O portal recebe eventos da extensão, normaliza esses dados, guarda parte do histórico e renderiza três áreas principais:

- `Subs e membros`
- `Superchats`
- `Chat unificado`

O ponto importante é este:

- o `chat unificado` é limitado
- `superchats`, `subs` e `members` viram histórico persistido
- a tela recalcula e recria partes desse histórico o tempo todo

## Fluxo De Um Evento

Fluxo simplificado de um evento:

```text
evento chega do bridge
   |
   v
normalizeIncoming()
   |
   +--> state.events (persistente, cresce sem teto útil para sub/member/superchat)
   |
   +--> liveEvents (temporário, limitado a 500)
   |
   v
scheduleRender()
   |
   v
render()
   |
   +--> filter / sort / map (arrays temporários)
   |
   +--> decorateSuperchatEvent() (cópia nova do objeto)
   |
   +--> renderCollection()
          |
          +--> cria ou atualiza nó DOM
          +--> remove nós que saíram da coleção
```

## O Que Fica Salvo

### `overlay_state`

Essa é a principal estrutura persistida do portal.

Ela guarda:

- filtro atual
- `roomId` do bridge
- `overlayId`
- histórico de eventos

Exemplo de formato:

```js
{
  version: 1,
  filter: "active",
  roomId: "ROOM123",
  overlayId: "evt_abc",
  events: [
    {
      id: "twitch:123",
      platform: "twitch",
      type: "superchat",
      user: "Fulano",
      timestamp: 1710000000000,
      status: "active",
      message: "apoio",
      amount: 100,
      currency: "BRL"
    }
  ]
}
```

### `overlay_room_id`

Essa chave guarda a sessão do bridge.

Exemplo:

```js
localStorage.setItem("overlay_room_id", "ROOM123");
```

### `overlay_api_session_id`

Essa chave guarda a sessão separada do overlay/API.

Exemplo:

```js
localStorage.setItem("overlay_api_session_id", "OVERLAY999");
```

## O Que Fica Em Memória

Memória aqui significa tudo que existe enquanto a aba continua viva.

Isso inclui:

- objetos JavaScript
- arrays temporários
- mapas e sets
- nós do DOM
- listeners
- timers
- estado de render

### 1. `state.events`

Esse é o histórico principal.

Ele cresce com:

- `sub`
- `member`
- `superchat`

Trecho central:

```js
state.events.push(event);
state.events.sort((a, b) => b.timestamp - a.timestamp);
```

Isso significa que a lista não é um buffer curto.
Ela é o histórico persistido do painel.

### 2. `liveEvents`

Essa lista é temporária e limitada:

```js
if (liveEvents.length > maxLiveMessages) {
  liveEvents.length = maxLiveMessages;
}
```

No padrão atual, o limite é 500.

### 3. `recentEventKeys`

É um `Map` usado para evitar duplicação por um período.

Exemplo:

```js
const recentEventKeys = new Map();
```

Ele é limpo por TTL, então não deveria crescer sem fim.

### 4. `collectionState`

A view mantém um `WeakMap` por container:

```js
const collectionState = new WeakMap();
```

Cada container mantém:

- `items`: `Map` de evento -> nó DOM
- `emptyNode`

Isso é útil para reaproveitar DOM, mas também significa que o número de nós vivos acompanha a coleção exibida.

### 5. Nós do DOM

Cada card mostrado na tela é criado a partir de template:

```js
const template = elements.eventTemplate.content.cloneNode(true);
```

e depois ajustado para o evento correspondente.

## O Que É Criado Em Cada Render

O render do portal faz isso:

```js
const visibleEvents = store.getVisibleEvents();
const priorityEvents = visibleEvents.filter(...).sort(...);
const superchatEvents = visibleEvents.filter(...).map(...).sort(...);
const chatEvents = store.liveEvents.slice().sort(...);
```

Isso gera:

- arrays novos
- cópias decoradas de superchat
- ordenação nova
- cálculo de contadores novo

### Cópia temporária de superchat

Para superchat, o código não usa o objeto original direto na UI.

Ele cria uma nova cópia:

```js
return {
  ...event,
  currency,
  currencyRate,
  currencyRateLoaded: hasCurrencyRate(currency),
  brlAmount,
  sortBrlAmount
};
```

Então o caso não é “o mesmo evento duplicado para sempre”.
É “o evento original + cópias temporárias para render”.

## Caso Ideal vs Caso Errado

### Caso ideal

Se houver 10 superchats ativos:

- 10 objetos originais ficam em `state.events`
- algumas cópias temporárias aparecem durante o render
- 10 cards podem estar no DOM

Isso é esperado.

### Caso errado

O caso errado seria:

- 10 eventos reais
- 20 ou 30 entradas persistidas para os mesmos 10
- DOM antigo nunca removido
- listeners duplicados

Pelo código atual, o portal tenta evitar esse cenário com:

- deduplicação por `id`
- deduplicação por `dedupeKey`
- remoção de nós fora da coleção

## Onde A RAM Realmente Cresce

O problema mais forte não é `localStorage` ocupando RAM diretamente.

O peso vem de:

1. histórico crescendo em `state.events`
2. render recalculando tudo a cada evento
3. criação de cópias temporárias de superchat
4. DOM de listas grandes
5. serialização persistente do estado inteiro

Trecho crítico:

```js
const nextRenderKey = [
  state.roomId,
  state.filter,
  state.overlayId || "",
  detailId || "",
  counts.totalEvents,
  counts.twitchSubs,
  counts.youtubeMembers,
  counts.totalCombined,
  counts.superchats,
  priorityEvents.length,
  superchatEvents.length,
  chatEvents.length,
  newestLiveId,
  oldestLiveId,
  superchatTotals.totalBrl.toFixed(2)
].join("|");
```

Isso mostra que o render depende do tamanho e do conteúdo do histórico.

## O Que Não Parece Ser O Principal Vilão

- `liveEvents` não cresce sem limite
- `recentEventKeys` é limitado por TTL
- `currencyRates` tende a ser pequeno
- `chatBridge` é criado uma vez e fechado no unload

Então o foco principal é o histórico persistido e o custo de render.

## Exemplo Prático

### Com poucos eventos

```text
10 superchats
10 objetos persistidos
10 cópias temporárias de render
10 cards no DOM
```

### Com live longa

```text
10 superchats
...
400 superchats
...
1500 eventos persistidos
...
re-render constante em cima do histórico inteiro
```

Nesse ponto, a aba pode ficar lenta porque:

- o JavaScript trabalha mais por render
- o DOM fica mais caro
- a memória viva cresce
- o navegador precisa gerenciar mais referência e layout

## Relação Com `Ctrl+F5`

Quando você dá `Ctrl+F5` no portal:

- a aba é reiniciada
- o JavaScript antigo morre
- o DOM antigo some
- os listeners são recriados
- os caches em memória são descartados

Isso “destrava” porque faz uma limpeza completa da página, não porque corrige a causa.

## Conclusão

Se a pergunta é “o portal está guardando 2 GB porque o localStorage é grande?”, a resposta mais provável é **não**.

O que realmente pesa é:

- histórico acumulado em memória
- render repetido sobre esse histórico
- cópias temporárias de eventos
- DOM mantido para listas grandes

Resumo curto:

- `liveEvents`: limitado
- `state.events`: cresce
- `render()`: recalcula tudo
- `DOM`: acompanha a coleção exibida
- `Ctrl+F5`: limpa tudo e mascara o problema

## Próximo Passo Técnico

Se a meta for reduzir RAM e travamento, o primeiro candidato é:

1. limitar o histórico persistido
2. separar histórico “ativo” de histórico arquivado
3. reduzir o custo de `render()`
4. evitar reprocessar a coleção inteira a cada evento
