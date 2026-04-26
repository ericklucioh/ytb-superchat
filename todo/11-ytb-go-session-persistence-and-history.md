# ytb-go session persistence and history

## Status
Concluído

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
Sessao, overlay e historico vivem em memoria e o historico e curto demais para suporte operacional.

## Objetivo
Tornar o estado mais util para producao, ou deixar a limitacao assumida e documentada.

## Checklist
- [x] decidir se sessao deve sobreviver a restart
- [x] decidir se o historico precisa ser persistido
- [x] reavaliar o limite atual de 50 eventos
- [x] documentar claramente o que acontece em restart
- [x] validar se o historico atende suporte real

## Criterios de aceite
- [x] o comportamento em restart fica claro
- [x] o historico e suficiente para diagnostico real
- [x] a limitacao de persistencia, se mantida, fica explicitamente assumida
