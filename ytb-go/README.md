# YTB Go Server

## Contexto
Este binário é o backend local responsável por sessão, overlay e broadcast.

## Objetivo
Ser a fonte de verdade do estado compartilhado entre portal, extensão e OBS.

Servidor local em Go para manter sessão, overlay e broadcast em tempo real.

- `cmd/ytb-go`: ponto de entrada
- `internal/httpapi`: rotas HTTP e overlay
- `internal/session`: estado por sessão
- `internal/ws`: WebSocket por sala

O binário serve o overlay do OBS, recebe eventos do portal e mantém o último overlay por sessão em memória.

## O Que Existe Hoje
- Rotas HTTP para health, sessão, eventos, rooms e overlay
- WebSocket por sessão
- Armazenamento em memória do último overlay
- Integração com o portal via `/api/event`

## O Que Precisa Ser Verdade
- `sessionId` isola o estado
- o Go não captura chat
- o Go distribui e mantém estado
- o OBS reconecta sem perder a sessão

## Critério De Pronto
- O backend responde em `/health`, `/api/session`, `/api/event`, `/api/rooms`, `/ws` e `/overlay`
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
