# ytb-go WebSocket backpressure

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
A fila do cliente WebSocket e pequena e descarta pacotes quando enche sem visibilidade forte.

## Objetivo
Evitar perda silenciosa quando o cliente de overlay ou browser source fica lento.

## Checklist
- [ ] revisar o tamanho do buffer `send`
- [ ] revisar o comportamento de `enqueue`
- [ ] definir estrategia clara para consumidores lentos
- [ ] adicionar log ou telemetria para pacotes descartados
- [ ] validar burst de mensagens com cliente lento

## Criterios de aceite
- [ ] trafego em burst nao some silenciosamente
- [ ] qualquer politica de descarte fica explicita
- [ ] perda visivel vira evento observavel para suporte
