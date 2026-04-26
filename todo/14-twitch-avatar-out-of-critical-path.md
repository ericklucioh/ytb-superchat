# Twitch avatar lookup out of critical path

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O fluxo atual espera `api.socialstream.ninja` antes de terminar a entrega se o avatar local nao existe, e a mensagem pode ser marcada como enviada cedo demais.

## Objetivo
Fazer a entrega do Twitch ser imediata e manter avatar como enriquecimento opcional.

## Checklist
- [x] enviar o evento assim que a captura terminar
- [x] mover o enriquecimento de avatar para caminho nao bloqueante
- [x] revisar quando a mensagem e marcada como entregue
- [x] manter fallback local se o avatar externo nao responder

## Criterios de aceite
- [x] avatar lento nao atrasa o evento
- [x] endpoint fora do ar nao impede delivery
- [x] a confirmacao visual de entrega so ocorre depois do handoff real
