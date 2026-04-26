# ytb-go auth and CORS hardening

## Status
Concluído

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
As rotas HTTP e WebSocket do backend estao abertas e o CORS aceita qualquer origem, o que nao e aceitavel para cliente real.

## Objetivo
Proteger o backend Go para que somente origens e sessoes confiaveis possam ler ou injetar estado.

## Checklist
- [x] adicionar autenticacao ou gate de trusted session
- [x] proteger `/api/event`, `/api/session`, `/api/rooms`, `/ws` e `/overlay`
- [x] trocar `*` por allowlist ou politica local-only
- [x] manter o fluxo local sem friccao desnecessaria
- [x] validar que origin nao confiavel nao acessa estado

## Criterios de aceite
- [x] origem nao confiavel nao injeta nem le estado de sessao
- [x] o fluxo local continua funcionando com origin confiavel explicitamente definido
- [x] o comportamento de CORS fica previsivel e documentado
