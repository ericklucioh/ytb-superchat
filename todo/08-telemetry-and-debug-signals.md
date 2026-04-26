# Telemetry and debug signals

## Prioridade
Media

## Depende de
- `todo/04-bridge-delivery-ack-validation.md`
- `todo/05-service-worker-backlog-recovery.md`

## Problema
Sem sinais minimos de telemetria, diagnosticar perda, duplicacao ou reconnect vira chute.

## Objetivo
Adicionar sinais pequenos, consistentes e session-scoped para suporte em producao.

## Checklist
- [ ] adicionar sinais para reconnects
- [ ] adicionar sinais para timeouts de ack
- [ ] adicionar sinais para hydration do backlog
- [ ] manter logs curtos e por sessao
- [ ] expor estado suficiente para diagnosticar perda ou duplicacao
- [ ] evitar logs barulhentos ou de alto custo

## Criterios de aceite
- [ ] uma sessao com problema pode ser investigada pelos logs
- [ ] a saida de debug nao e ruidosa em producao
- [ ] os sinais ajudam suporte sem exigir instrumentacao pesada
