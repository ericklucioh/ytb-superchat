# Arquitetura Ideal do Clone

## Summary
O ideal neste repositório não é “migrar a URL do overlay”, e sim separar claramente as responsabilidades.

A estrutura certa fica assim:
- `API Go` = núcleo de sessão, room, estado do overlay e transporte em tempo real
- `Portal` = dashboard + tela do overlay + UI de controle
- `Extension` = captura de chat e adaptação por plataforma
- `OBS` = consumidor final do overlay, sem lógica de negócio

Hoje o projeto ainda está híbrido: a extensão continua carregando o HTML/CSS do overlay e o portal ainda é só dashboard. O ideal é inverter isso e fazer o portal ser a origem oficial do overlay.

## Dependências Certas
- `OBS` depende apenas do `Portal Overlay URL`, por exemplo `/overlay?session=...`
- `Portal` depende da `API Go` para publicar overlay, ler estado e sincronizar sessão
- `Extension` depende da `API Go` e do contrato de sessão, mas não do renderer do overlay
- `API Go` depende do contrato dos eventos, não da UI da extensão nem do OBS

Em outras palavras:
- a extensão captura
- o portal coordena
- a API centraliza
- o OBS só exibe

## O Que Cada Pilar Deve Fazer
- `API`
  - guardar sessão/room
  - aceitar eventos do dashboard e da extensão
  - manter último overlay por sessão
  - expor `health`, `session`, `event`, `rooms` e o stream em tempo real
  - ser a única fonte de verdade do estado do overlay
- `Portal`
  - listar e filtrar mensagens
  - selecionar mensagem para overlay
  - abrir/servir a página do overlay
  - aplicar o visual do overlay usando os assets do portal, não da extensão
- `Extension`
  - capturar YouTube/Twitch e demais fontes legadas
  - normalizar eventos
  - enviar para a API
  - persistir `streamID`
  - não renderizar overlay nem ser dona do CSS do OBS
- `OBS`
  - consumir uma URL estável do portal
  - receber updates em tempo real
  - não conhecer nenhum detalhe de captura ou dashboard

## O Que Precisa De Quem
- `API` precisa do contrato de sessão e do payload de overlay
- `Portal` precisa do estado da API e do visual do overlay
- `Extension` precisa só do contrato de ingestão e do `streamID`
- `OBS` precisa só da URL do overlay e do `session`

## Ideal A Ser Feito
- mover o HTML/CSS do overlay para o `portal`
- fazer o build gerar `out/portal/overlay`
- fazer o Go servir o overlay a partir do build do portal
- remover o overlay renderer da extensão como caminho principal
- manter a extensão apenas como coleta e bridge
- manter o contrato de payload compatível com o que o dashboard já gera hoje
- eliminar o caminho ativo de `api.overlay.ninja` do fluxo principal
- deixar o Go como backend real de sessão/overlay, não só como proxy

## Test Plan
- abrir `/overlay?session=...` e ver o overlay renderizar sozinho
- selecionar uma mensagem no portal e ver ela aparecer no OBS
- mandar `contents: false` e ver o overlay limpar
- confirmar que o dashboard continua funcionando com a extensão instalada
- confirmar que a extensão ainda captura os chats suportados
- confirmar que o build gera portal e overlay sem depender da pasta `extension` como renderer
- confirmar que não existe mais dependência ativa de `api.overlay.ninja` no caminho principal

## Assumptions
- o portal é o dono definitivo do overlay
- a extensão vira só capturadora/adaptadora
- o OBS só consome URL
- a API Go fica como núcleo do sistema
- o comportamento visual do overlay deve permanecer equivalente ao atual, só mudando de lugar no repo
