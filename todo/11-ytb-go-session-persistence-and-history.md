# ytb-go session persistence and history

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
Sessao, overlay e historico vivem em memoria e o historico e curto demais para suporte operacional.

## Objetivo
Tornar o estado mais util para producao, ou deixar a limitacao assumida e documentada.

## Checklist
- [ ] decidir se sessao deve sobreviver a restart
- [ ] decidir se o historico precisa ser persistido
- [ ] reavaliar o limite atual de 50 eventos
- [ ] documentar claramente o que acontece em restart
- [ ] validar se o historico atende suporte real

## Criterios de aceite
- [ ] o comportamento em restart fica claro
- [ ] o historico e suficiente para diagnostico real
- [ ] a limitacao de persistencia, se mantida, fica explicitamente assumida
