# Limites Do Chrome Como "Servidor"

## Pergunta

Existe um jeito de o Chrome “rodar um servidor” a partir do site ou da extensão, para depois sincronizar com o OBS?

## Resposta Curta

Não do jeito que normalmente se imagina.

Um site no Chrome não vira um servidor local de verdade para o sistema inteiro, e uma extensão também não substitui um backend local acessível por outros aplicativos como o OBS.

## O Que Não Dá Para Fazer

- transformar um site em um servidor HTTP/WebSocket local para outros apps
- expor uma porta `127.0.0.1` diretamente só com HTML/JS do portal
- fazer o Chrome “escutar” conexões externas como um serviço nativo

## O Que Dá Para Fazer

### 1. Site -> Extensão

O site pode mandar instruções para a extensão.

Isso já é o que o projeto faz em parte:

- o portal gera a sessão
- a extensão sincroniza o `streamID`
- os popups capturam os chats

### 2. Extensão -> App Local

A extensão pode conversar com um aplicativo nativo instalado no computador.

Esse app local é quem pode:

- abrir uma porta HTTP/WebSocket
- receber eventos
- repassar para o OBS

### 3. App Local -> OBS

O OBS então consome esse servidor local por:

- browser source
- websocket local
- ou outro canal de integração local

## Fluxo Realista

Se a ideia for “um botão no site para iniciar o servidor”, a arquitetura prática fica assim:

1. o usuário abre o site
2. o site aciona a extensão
3. a extensão fala com um helper local
4. o helper local sobe o servidor
5. o OBS passa a consumir esse servidor

## Por Que O Chrome Sozinho Não Resolve

O Chrome foi feito para:

- executar páginas
- rodar extensões
- comunicar com APIs e serviços externos

Ele não foi feito para ser um serviço local permanente do sistema, acessível livremente por outros programas.

## Conclusão

Se a meta é simplicidade, a melhor rota continua sendo:

- site
- extensão
- popups
- dashboard
- OBS

Se a meta é expor um servidor local para o OBS, aí entra um helper nativo ou backend local.

## Recomendação

Por enquanto, vale manter a arquitetura atual e só evoluir para um helper local se a dependência dos popups e do background realmente ficar insustentável.
