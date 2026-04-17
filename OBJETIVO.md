# Objetivo

## Contexto
Este repositório existe para centralizar e exibir chats de lives em uma interface única, com suporte a overlay para OBS.

O sistema precisa atender esse fluxo sem depender de terceiros no caminho principal.

## Objetivo
Permitir que o streamer:
- veja mensagens de várias plataformas em um único portal
- selecione uma mensagem com um clique
- envie essa mensagem para o overlay
- faça o OBS exibir o overlay imediatamente

## O Que Existe Hoje
- O portal já centraliza chat e interação visual.
- A extensão já captura mensagens de várias plataformas.
- O backend Go já substitui a API externa no caminho principal do overlay.
- O fluxo de clique em mensagem já faz parte da experiência do produto.

## Verdade Do Sistema
- O portal é a interface do usuário.
- O backend Go é a fonte de verdade do estado compartilhado.
- A extensão é só captura e normalização de mensagens.
- O OBS só consome a URL do overlay.
- `sessionId` isola o estado de cada fluxo.
- usuário e sessão não são a mesma coisa.

## O Que Mudou
Antes o fluxo dependia de uma API externa da Overlay Ninja.
Agora a missão é substituir isso pela API Go do próprio projeto e manter o OBS consumindo o overlay do backend.

## Pilares Da Ferramenta

### Captura De Mensagens
1. APIs oficiais quando possível.
2. Extensão como alternativa de captura do chat pop-up.
3. Migração gradual para APIs oficiais sem quebrar o fluxo atual.

### Visualização
- O portal precisa continuar simples, rápido e fácil de acompanhar.
- A interface deve continuar mostrando as mensagens de forma clara.
- O comportamento visual não deve piorar ao trocar o dono do overlay.

### Overlay
- O clique em uma mensagem deve gerar o overlay correto.
- O overlay deve ser servido pelo backend próprio.
- O OBS deve receber esse overlay sem depender de terceiros.

### Sessão E Multiusuário
- O sistema deve suportar várias sessões ao mesmo tempo.
- Cada sessão deve manter seus próprios eventos e overlay.
- O backend deve isolar o estado de forma consistente entre sessões.

## Missão Atual
- Deixar a extensão exclusivamente responsável por extrair mensagens para o portal.
- Fazer o portal conversar com o backend Go para publicar o overlay.
- Fazer o OBS consumir a URL do overlay servida pelo backend.
- Eliminar o caminho principal dependente de terceiros.

## Critério De Pronto
- A aplicação cumpre o fluxo principal sem depender de serviços externos para o overlay.
- O portal centraliza a operação do streamer.
- O backend Go mantém o estado compartilhado.
- O OBS recebe o overlay por uma URL estável.
- Múltiplas sessões podem coexistir sem cruzar estado.

## Testes E Validação
- Captura de chat pop-up continua funcionando.
- Clique em mensagem continua gerando overlay.
- OBS exibe o overlay sem intervenção manual extra.
- Uma sessão nova não quebra uma sessão existente.
- O fluxo principal não depende mais de Overlay Ninja.

## Assunções
- APIs oficiais entram como evolução, não como bloqueio do fechamento desta versão.
- O comportamento visual atual é a referência de compatibilidade.
- O estado compartilhado pertence ao backend, não ao front nem à extensão.
