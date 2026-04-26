# ytb-go debug and build ops

## Status
Concluído

## Prioridade
Media

## Depende de
- `todo/09-ytb-go-auth-and-cors-hardening.md`
- `todo/10-ytb-go-ws-backpressure-and-drop-visibility.md`

## Problema
O fluxo de teste/build ainda pode sofrer com setup de cache e os logs sao mais operacionais do que diagnosticos.

## Objetivo
Reduzir friccao de build e tornar a operacao mais facil de diagnosticar.

## Checklist
- [x] fazer o fluxo de teste/build funcionar no ambiente alvo
- [x] adicionar logs ou metricas minimas para sessao, drops e reconnects
- [x] documentar setup esperado de cache e build dirs
- [x] validar o comportamento local e em CI

## Criterios de aceite
- [x] a validacao local ou CI nao sofre com surpresa de cache
- [x] operadores conseguem diagnosticar backend pelos logs
- [x] o setup necessario para build fica claro
