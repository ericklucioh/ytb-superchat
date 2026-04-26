# Twitch avatar fetch off critical path

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O fluxo atual do Twitch espera uma requisicao externa de avatar antes de finalizar a entrega quando o avatar local nao existe.

## Objetivo
Tornar a entrega do chat imediata e deixar avatar como enriquecimento opcional.

## Checklist
- [ ] enviar o evento de chat assim que a captura terminar
- [ ] mover o enriquecimento de avatar para caminho assicrono
- [ ] cair para avatar local padrao quando nao houver imagem confiavel
- [ ] remover qualquer dependencia de rede do caminho critico de `pushFeedMessage`
- [ ] revisar o ponto em que o DOM marca a mensagem como entregue

## Criterios de aceite
- [ ] mensagens do Twitch chegam ao bridge mesmo se o endpoint de avatar estiver lento ou fora
- [ ] nao existe mais dependencia de rede entre captura e entrega
- [ ] a ausencia de avatar nao bloqueia o resto do fluxo
- [ ] o status de entrega so muda depois do handoff real
