# Bridge delivery ack validation

## Prioridade
Alta

## Depende de
- `todo/05-service-worker-backlog-recovery.md`

## Problema
A ponte agora depende de fila pendente, armazenamento persistente e `ack` explicito. Isso precisa ser validado com cenarios reais de reconexao e atraso.

## Objetivo
Confirmar que a entrega fonte -> worker -> dashboard e idempotente e nao perde mensagens.

## Checklist
- [ ] verificar que pacotes `publish` recebem `ack` uma unica vez
- [ ] verificar que duplicatas nao aumentam a fila pendente
- [ ] verificar que troca de sessao nao deixa backlog velho
- [ ] validar reconexao com mensagens em voo
- [ ] testar perda temporaria do canal e reprise

## Criterios de aceite
- [ ] o fluxo `ack` e pendente permanece idempotente
- [ ] nao aparece evento duplicado no dashboard durante testes de reconexao
- [ ] mensagens em transito nao somem sem rastreio
- [ ] o contrato de entrega fica claro o suficiente para manutencao
