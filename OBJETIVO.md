# Objetivo

O produto é um portal para centralizar chats de lives em várias plataformas:

- YouTube
- Twitch
- Kick
- mensagens pagas como superchat, bits e livepix
- assinaturas como subs e membros

A missão é permitir que o streamer acompanhe tudo com facilidade e clique em qualquer mensagem para enviar essa mensagem para o overlay, que então aparece no OBS e na live.

## Verdade Do Sistema

- O portal é a interface do usuário.
- O backend Go é a fonte de verdade do estado compartilhado.
- A extensão é só captura e normalização de mensagens.
- O OBS só consome a URL do overlay.

## O Que Já Funciona

- Captura de mensagens do chat pop-up.
- Envio dessas mensagens para o portal.
- Exibição do chat e organização visual no portal.
- Fluxo de clique na mensagem para gerar overlay.

## O Que Mudou

Antes o fluxo dependia de uma API externa da Overlay Ninja.
Agora a meta é substituir isso com a API Go do próprio projeto.

## Pilares Da Ferramenta

### Captura De Mensagens
1. APIs oficiais quando possível.
2. Extensão como alternativa de captura do chat pop-up.
3. Migração gradual para APIs oficiais sem quebrar o fluxo atual.

### Visualização
- O portal precisa continuar simples, rápido e fácil de acompanhar.
- A interface deve continuar mostrando as mensagens de forma clara.

### Overlay
- O clique em uma mensagem deve gerar o overlay correto.
- O overlay deve ser servido pelo backend próprio.
- O OBS deve receber esse overlay sem depender de terceiros.

### Sessão E Multiusuário
- O sistema deve suportar várias sessões ao mesmo tempo.
- `sessionId` isola o estado de cada fluxo.
- usuário e sessão são coisas diferentes.

## Missão Atual

- Deixar a extensão exclusivamente responsável por extrair mensagens para o portal.
- Fazer o portal conversar com o backend Go para publicar o overlay.
- Fazer o OBS consumir a URL do overlay servida pelo backend.
- Eliminar o caminho principal dependente de terceiros.
