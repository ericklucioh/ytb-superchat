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
- [x] enviar o evento de chat assim que a captura terminar
- [x] mover o enriquecimento de avatar para caminho assicrono
- [x] cair para avatar local padrao quando nao houver imagem confiavel
- [x] remover qualquer dependencia de rede do caminho critico de `pushFeedMessage`
- [x] revisar o ponto em que o DOM marca a mensagem como entregue

## Criterios de aceite
- [x] mensagens do Twitch chegam ao bridge mesmo se o endpoint de avatar estiver lento ou fora
- [x] nao existe mais dependencia de rede entre captura e entrega
- [x] a ausencia de avatar nao bloqueia o resto do fluxo
- [x] o status de entrega so muda depois do handoff real
