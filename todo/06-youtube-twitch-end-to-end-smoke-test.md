# YouTube and Twitch smoke test

## Prioridade
Alta

## Depende de
- `todo/01-youtube-observer-guard.md`
- `todo/02-twitch-remove-avatar-network-from-critical-path.md`
- `todo/03-twitch-background-sweep-hardening.md`
- `todo/04-bridge-delivery-ack-validation.md`
- `todo/05-service-worker-backlog-recovery.md`

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
