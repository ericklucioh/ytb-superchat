# YTB Superchat Go Server

Arquitetura proposta para substituir o backend remoto antigo por um executável Go local.

O objetivo é separar claramente os dois fluxos do projeto:

1. `chat popup -> extensão -> dashboard`
2. `dashboard -> servidor Go -> overlay do OBS`

O primeiro fluxo já está resolvido no navegador.
O segundo fluxo precisa de um servidor local para transportar os eventos até o browser source do OBS.

---

## Visão Geral

O executável Go atua como um servidor local de baixa complexidade.
Ele não precisa entender o DOM das plataformas nem capturar chat.
Essa parte continua na extensão e no dashboard.

O papel do Go é:

- servir o overlay do OBS
- receber eventos do dashboard
- manter o estado da sessão em memória
- distribuir mensagens para qualquer overlay conectado
- expor endpoints de saúde e diagnóstico

Em outras palavras:

- a extensão captura
- o dashboard organiza
- o Go distribui para o OBS

---

## Requisitos

### Requisitos do ambiente

- Go `1.22+`
- Chrome ou Chromium com a extensão carregada
- OBS com Browser Source
- sistema operacional com acesso a `localhost`

### Requisitos funcionais

- o dashboard precisa continuar funcionando localmente
- o overlay do OBS precisa receber eventos em tempo real
- a sessão precisa ser compartilhada entre dashboard e overlay
- o servidor precisa sobreviver a reconexões sem perder o estado atual da sessão

### Requisitos não funcionais

- latência baixa
- configuração mínima
- sem banco de dados no primeiro corte
- sem dependência de serviços externos
- fácil de subir e encerrar

---

## Domínios

### Produção

- `https://ytb.ericklucioh.com/`

Uso:

- dashboard principal
- ponto de entrada da instalação
- documentação pública ou portal

### Desenvolvimento local

- `http://localhost:8000/src/index.html`
- `http://localhost:8000/extension/index.html?session=YOUR_SESSION_ID`

Uso:

- validar o dashboard atual
- testar a extensão no navegador

### Servidor Go local

Exemplo recomendado:

- `http://127.0.0.1:8080`

Uso:

- overlay do OBS
- endpoints de sessão
- broadcast em tempo real

Observação:

- o domínio exato do Go pode ser `localhost`, `127.0.0.1` ou uma porta customizada
- o importante é que o OBS consiga consumir esse endereço localmente

---

## Responsabilidades Do Executável Go

O binário Go deve fazer somente o que é necessário para o overlay funcionar.

### Deve fazer

- servir arquivos estáticos do overlay
- aceitar eventos enviados pelo dashboard
- manter sessões em memória
- manter conexões WebSocket por sessão
- retransmitir mensagens para clientes conectados
- responder health checks
- limpar conexões mortas

### Não deve fazer no primeiro corte

- capturar chat da Twitch/YouTube
- interpretar DOM de páginas de plataforma
- persistir banco de dados completo
- autenticação pesada
- painel administrativo
- sincronização multi-host

---

## Fluxo De Dados

### Fluxo 1: captura de chat

1. o usuário abre o chat popout
2. a extensão captura as mensagens
3. a extensão envia os eventos para o dashboard
4. o dashboard normaliza e organiza os dados

### Fluxo 2: overlay do OBS

1. o dashboard envia eventos para o servidor Go
2. o Go distribui os eventos para a sessão correta
3. o OBS abre o overlay servido pelo Go
4. o overlay recebe as atualizações e renderiza

### Fluxo 3: reconexão

1. o OBS perde a conexão
2. o overlay reconecta pela mesma `session`
3. o Go reenvia o estado atual da sessão
4. o overlay volta sem exigir reconfiguração manual

---

## Rotas

As rotas abaixo são a base mínima recomendada.

### `GET /`

Página inicial do serviço.

Uso:

- redirecionar ou exibir uma página simples com status
- apontar o usuário para dashboard e overlay

### `GET /health`

Health check simples.

Resposta esperada:

```json
{
  "ok": true,
  "service": "ytb-go",
  "version": "1.0.0"
}
```

Uso:

- validar se o executável está vivo
- facilitar watchdog ou scripts de inicialização

### `GET /overlay?session=ABC`

Entrega o overlay do OBS para uma sessão específica.

Uso:

- Browser Source do OBS
- conexão em tempo real por WebSocket ou SSE

### `GET /ws/overlay?session=ABC`

WebSocket do overlay.

Uso:

- receber eventos em tempo real
- reconectar sem perder a sessão

### `POST /api/session`

Cria ou atualiza a sessão.

Payload de exemplo:

```json
{
  "session": "ABC123",
  "source": "dashboard"
}
```

Uso:

- registrar a sessão atual
- sincronizar dashboard e overlay

### `POST /api/event`

Recebe um evento já normalizado.

Payload de exemplo:

```json
{
  "session": "ABC123",
  "type": "message",
  "platform": "youtube",
  "user": "Nome",
  "message": "Olá",
  "timestamp": 1710000000000
}
```

Uso:

- entrada principal do dashboard para o Go
- broadcast para todos os overlays conectados na mesma sessão

### `GET /api/session/:id`

Retorna o estado atual da sessão.

Uso:

- debug
- reconexão
- carregamento inicial do overlay

### `GET /static/*`

Arquivos estáticos do overlay.

Uso:

- HTML
- CSS
- JS
- imagens

---

## Contrato De Sessão

### Identificador

- `session` é a chave principal do sistema
- deve ser curta, simples e sem espaços
- idealmente alfanumérica

### Estado mínimo por sessão

- lista de mensagens recentes
- lista de overlays conectados
- timestamp da última atividade
- último payload conhecido

### Regra de compartilhamento

- dashboard e OBS precisam usar a mesma `session`
- se a `session` mudar, o overlay deve mudar junto

---

## Contrato De Eventos

O servidor Go não precisa transformar os dados.
Ele pode receber um payload já normalizado pelo dashboard.

### Campos principais

- `session`
- `platform`
- `type`
- `user`
- `message`
- `timestamp`
- `status`

### Campos opcionais

- `chatimg`
- `chatbadges`
- `amount`
- `currency`
- `tier`
- `months`
- `giftCount`
- `backgroundColor`
- `textColor`

### Tipos esperados

- `message`
- `sub`
- `member`
- `superchat`

---

## Ações Do Executável Go

O binário deve ter comportamentos bem definidos.

### Inicialização

- carregar a porta
- iniciar o HTTP server
- iniciar o gerenciador de sessões em memória
- carregar assets estáticos
- registrar rotas

### Durante a execução

- aceitar eventos do dashboard
- aceitar conexões do overlay
- fazer broadcast por sessão
- enviar estado inicial ao reconectar
- remover conexões inválidas

### Encerramento

- fechar WebSockets
- limpar sessões inativas
- liberar arquivos/handles
- encerrar sem corromper o estado em memória

---

## Comandos Esperados

### Iniciar servidor

```bash
./ytb-go
```

ou

```bash
./ytb-go --port 8080
```

### Desenvolvimento

```bash
go run ./cmd/ytb-go --port 8080
```

### Build

```bash
go build -o ytb-go ./cmd/ytb-go
```

### Health check

```bash
curl http://127.0.0.1:8080/health
```

---

## Integração Com O Projeto Atual

### O que continua no navegador

- captura do chat
- normalização do dashboard
- seleção manual de mensagens
- persistência local de estado de interface

### O que sai do navegador

- transporte do overlay para o OBS
- broadcast em tempo real para o browser source

### O que o Go substitui

- caminho remoto antigo do overlay
- backend externo para comunicação em tempo real

---

## Requisitos Mínimos De Implementação

Se for fazer a versão mais simples possível, o Go precisa no mínimo de:

1. servidor HTTP
2. WebSocket para o overlay
3. WebSocket ou `POST` para entrada do dashboard
4. mapa `session -> estado`
5. limpeza de conexões mortas
6. envio do estado inicial na reconexão

Sem isso, o OBS vai depender de reabertura manual ou de um backend externo.

---

## Recomendação Prática

Para este projeto, a arquitetura mais equilibrada é:

- extensão captura
- dashboard organiza
- Go recebe e distribui
- OBS consome o overlay local

Isso remove a dependência do backend remoto antigo sem complicar a captura do chat.

---

## Escopo Fora Do Primeiro Corte

Esses itens podem vir depois, se necessário:

- autenticação
- persistência em disco
- múltiplos perfis
- métricas
- painel de logs
- suporte a múltiplas máquinas

---

## Resumo

Sim, você pode usar:

- site local estático com informações da live
- executável Go como servidor HTTP local
- OBS consumindo o overlay por `localhost`

O mínimo para isso funcionar é:

- receber eventos normalizados do dashboard
- manter sessão em memória
- distribuir para overlays conectados
- servir o HTML do overlay

Se quiser, o próximo passo natural é transformar este documento em uma especificação de API com:

- formato exato dos JSONs
- rotas finais
- exemplos de request/response
- estrutura de pastas do projeto Go
