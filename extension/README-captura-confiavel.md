# Captura confiável da extensão

## Problema

A extensão captura mensagens de chat, assinaturas e superchats em várias plataformas e envia esses eventos para o portal.

O risco não está só em "capturar o DOM". O risco real é este:

- o evento ser identificado corretamente
- o envio para a bridge falhar por um instante
- o item já ter sido marcado como enviado
- a página mudar, recarregar ou ser fechada antes do reenvio

Nesse cenário, a mensagem parece ter sido capturada, mas na prática pode não chegar ao portal.

Isso é mais sensível para:

- `superchat`
- `assinaturas` / `memberships`
- eventos de alto valor, onde perder um item não é aceitável

## O que existe hoje

Hoje a extensão já faz boa parte do caminho:

- detecta mensagens nas páginas suportadas
- normaliza os dados
- envia para o bridge local
- o `service_worker` mantém backlog e deduplicação

Isso funciona bem na maior parte do tempo, mas ainda não é uma confirmação forte de entrega.

O ponto fraco é que o conteúdo pode ser marcado como enviado antes da confirmação final do outro lado.

## Objetivo da correção

Garantir que `superchat` e `assinaturas` não sejam perdidos quando houver falha temporária no bridge, no service worker ou na página.

## Status

A solução principal foi implementada no fluxo da extensão:

- fila persistente para eventos pendentes
- `ack` explícito do `service_worker`
- heartbeat leve para detectar sessão travada
- watchdog de reconexão no bridge da fonte

## Opções

### 1. Fila persistente com `chrome.storage.local` + `ack` de confirmação

Essa é a opção mais segura.

Fluxo:

1. a extensão captura o evento
2. grava o evento como `pending` em `chrome.storage.local`
3. envia para o bridge
4. o portal ou o bridge responde com `ack`
5. a extensão remove o evento da fila

Vantagens:

- tolera recarga, crash e falha temporária
- permite reenvio automático
- dá rastreabilidade clara do que ainda não foi confirmado

Desvantagens:

- exige protocolo de confirmação
- precisa cuidar de duplicação e limpeza de pendências

Recomendação:

- usar para `superchat` e `assinaturas`
- se quiser, também pode cobrir mensagens normais

### 2. Só `chrome.storage.local` com reenvio por tentativa

Aqui a extensão salva os eventos e tenta reenviar até conseguir, mas sem confirmação explícita.

Vantagens:

- mais simples que a opção 1
- já reduz perda por falha momentânea

Desvantagens:

- não prova que o portal recebeu o evento
- pode reenviar item que já foi processado
- a confiabilidade fica por heurística, não por contrato

Uso indicado:

- solução intermediária
- boa para reduzir perda, mas não para eliminar o risco

### 3. Backlog apenas no `service_worker`

A extensão mantém a fila em memória do worker e usa o backlog atual do bridge.

Vantagens:

- quase não mexe na arquitetura atual
- aproveita o que já existe

Desvantagens:

- o worker pode ser reiniciado
- memória não é garantia persistente
- ainda existe janela de perda antes do evento entrar na fila

Uso indicado:

- útil como melhoria incremental
- não é suficiente se o requisito for "não pode perder de jeito nenhum"

### 4. `localStorage` no contexto da página

É a opção menos indicada.

Vantagens:

- fácil de implementar no script da página

Desvantagens:

- depende do contexto da aba
- não é confiável para confirmação de entrega
- pode ser afetado por navegação, reload e troca de contexto

Uso indicado:

- só como rascunho ou debug
- não serve como garantia de entrega

## Recomendação

Para o problema atual, a melhor opção é:

1. `chrome.storage.local` como fila persistente
2. `ack` explícito de recebimento
3. deduplicação por `id` no bridge e no portal

Essa combinação é a que mais protege `superchat` e `assinaturas` contra perda.

## Critério de aceite

A solução só deve ser considerada pronta quando:

- um `superchat` continuar salvo mesmo se a página recarregar no meio do envio
- uma assinatura continuar pendente se a bridge cair antes do `ack`
- o portal não duplicar eventos já confirmados
- a fila pendente poder ser limpa ou inspecionada com segurança
