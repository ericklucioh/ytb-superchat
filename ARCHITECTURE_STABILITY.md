# Arquitetura: Estabilidade Do Fluxo De Chat

## Contexto

Hoje o projeto depende de popups de chat da Twitch e do YouTube para capturar mensagens.
Em segundo plano, o navegador pode reduzir prioridade da aba, atrasar observers e enfraquecer timers.
Isso faz a captura parecer “instável” quando, na prática, a página só entrou em modo econômico.

## Objetivo

Definir o caminho mais estável possível, sem depender de APIs oficiais, para manter o fluxo de chat funcionando com o menor atrito possível.

## Comparativo De Abordagens

### 1. Browser-only com popups

Fluxo:

- popup da Twitch/YouTube aberto
- extensão captura o DOM
- extension service worker atua como relay
- dashboard recebe os eventos

Vantagens:

- não precisa de programa extra
- manutenção simples
- já encaixa no que o projeto tem hoje

Desvantagens:

- depende do popup continuar vivo
- sofre com throttling em background
- requer watchdog e reconexão automática

### 2. Browser-only com watchdog

Fluxo:

- popup aberto em janela separada
- heartbeat leve da aba
- service worker monitora `lastSeenAt`
- reconexão automática quando a aba fica parada

Vantagens:

- melhora muito a experiência
- reduz cliques manuais
- continua sem backend externo

Desvantagens:

- ainda depende do navegador e do DOM da plataforma
- pode reiniciar abas em momentos ruins se os timeouts forem agressivos

### 3. Companion app local

Fluxo:

- um processo local no PC do streamer captura e repassa os eventos
- o browser fica só com dashboard e OBS

Vantagens:

- mais estável
- menos dependente de aba em background
- melhor para uso contínuo

Desvantagens:

- mais trabalho
- exige distribuição/instalação extra
- aumenta a complexidade de suporte

## Recomendação

Se a prioridade é **simplicidade com estabilidade razoável**, a melhor combinação é:

1. extensão como relay principal
2. popups em janela separada
3. heartbeat + watchdog
4. auto-reconnect e auto-reload apenas quando necessário

Se a prioridade é **estabilidade máxima**, o caminho final tende a ser um companion app local.

## Ordem Prática De Evolução

### Fase 1

- manter o fluxo browser-only
- adicionar heartbeat
- adicionar watchdog
- evitar depender de clique para “acordar” a aba

### Fase 2

- melhorar heurísticas de detecção de popup parado
- reduzir reloads falsos
- tornar o reconnect mais conservador

### Fase 3

- se a experiência ainda for instável, migrar a ingestão para um companion app local

## Critério De Sucesso

O fluxo está saudável quando:

- o popup pode ficar em segundo plano sem perder mensagens por longos períodos
- o dashboard continua recebendo eventos sem intervenção manual
- o OBS não depende de reativação manual da aba
- as reconexões acontecem só quando realmente necessárias

## Resumo Curto

- Mais simples: browser-only
- Melhor equilíbrio: browser-only + watchdog
- Mais estável: companion app local
