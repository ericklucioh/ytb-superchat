# YTB Go Server

## Contexto
Este binário é o backend local responsável por sessão, overlay e broadcast.

## Objetivo
Ser a fonte de verdade do estado compartilhado entre portal e OBS.

Servidor local em Go para manter sessão, overlay e broadcast em tempo real.

- `cmd/ytb-go`: ponto de entrada
- `internal/httpapi`: rotas HTTP e overlay
- `internal/session`: estado por sessão
- `internal/ws`: WebSocket por sala

O binário serve o overlay do OBS, recebe eventos do portal e mantém o último overlay por sessão em memória.

## O Que Existe Hoje
- Rotas HTTP para health, sessão, eventos, rooms e overlay
- Rotas HTTP para keep-awake manual com `/keep-awake/start` e `/keep-awake/status`
- WebSocket por sessão
- Armazenamento em memória do último overlay
- Integração com o portal via `/api/event`

## O Que Precisa Ser Verdade
- `sessionId` isola o estado
- o Go não captura chat
- o Go distribui e mantém estado
- o OBS reconecta sem perder a sessão

## Critério De Pronto
- O backend responde em `/health`, `/keep-awake/start`, `/keep-awake/status`, `/api/session`, `/api/event`, `/api/rooms`, `/ws` e `/overlay`
- O overlay da sessão correta volta após reconexão
- Múltiplas sessões convivem sem conflito

## Testes E Validação
- `go test ./...`
- request manual em `/health`
- criação e leitura de sessão
- envio de evento e broadcast por sessão

## Assunções
- O armazenamento é em memória nesta etapa.
- Persistência futura pode entrar depois, sem quebrar o contrato atual.

## Ambiente

- `PORT` é a porta usada em plataformas como Render
- `YTB_APP_ENV` distingue desenvolvimento e produção nos scripts do portal
- `YTB_GO_PORT` controla a porta do backend Go
- `YTB_OVERLAY_DIR` aponta para os assets do overlay
- `YTB_API_TOKEN` habilita o gate de autenticação para API e WebSocket
- `YTB_SHARED_SECRET` é um alias compatível para o mesmo token
- `YTB_ALLOWED_ORIGINS` define a allowlist de origens CORS confiáveis
- `PUBLIC_BACKEND_URL` ou `YTB_PUBLIC_BACKEND_URL` definem a URL pública usada pelo keep-awake para pingar `/health`
- `YTB_PORTAL_PORT` define a porta do portal usada como fallback na allowlist CORS e no runtime env, por padrão `8000`
- `PORTAL_PORT` continua aceito como fallback de compatibilidade para a porta do portal
- `YTB_SESSION_REAPER_INTERVAL` define com que frequência o reaper roda, por padrão `5m`
- `YTB_SESSION_REAPER_MAX_AGE` define após quanto tempo sem atividade a sessão é removida, por padrão `24h`
- `GO_PORT` continua aceito como fallback por compatibilidade
- `OVERLAY_DIR` continua aceito como fallback por compatibilidade
