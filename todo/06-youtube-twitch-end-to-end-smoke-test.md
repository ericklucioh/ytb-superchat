# YouTube and Twitch smoke test

## Prioridade
Alta

## Depende de
- `extension/tests/bridge-contract.test.js`
- `extension/DEPENDENCY-AUDIT.md`

## Problema
As duas plataformas principais precisam de validacao manual em ambiente real antes de liberar para cliente.

## Objetivo
Executar um smoke test ponta a ponta em YouTube e Twitch com tab visivel, em background, com reload e com desconexao temporaria.

## Checklist
- [ ] abrir YouTube live chat em popout e confirmar fluxo no portal
- [ ] abrir Twitch popout e confirmar fluxo no portal
- [ ] repetir com a aba do chat em segundo plano
- [ ] repetir com reload da aba durante fluxo ativo
- [ ] repetir com desconexao temporaria do bridge ou worker
- [ ] registrar qualquer perda, atraso ou duplicacao observada

## Criterios de aceite
- [ ] ambas as plataformas funcionam em estado visivel e em background
- [ ] reconnect nao perde mensagens
- [ ] reconnect nao duplica mensagens
- [ ] o comportamento observado bate com o backlog e com a revisao estatica
