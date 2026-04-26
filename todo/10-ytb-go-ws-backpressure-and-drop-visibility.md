# ytb-go WebSocket backpressure

## Status
Concluído e validado

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
A fila do cliente WebSocket e pequena e descarta pacotes quando enche sem visibilidade forte.

## Objetivo
Evitar perda silenciosa quando o cliente de overlay ou browser source fica lento.

## Checklist
- [x] revisar o tamanho do buffer `send`
- [x] revisar o comportamento de `enqueue`
- [x] definir estrategia clara para consumidores lentos
- [x] adicionar log ou telemetria para pacotes descartados
- [x] validar burst de mensagens com cliente lento

## Criterios de aceite
- [x] trafego em burst nao some silenciosamente
- [x] qualquer politica de descarte fica explicita
- [x] perda visivel vira evento observavel para suporte
