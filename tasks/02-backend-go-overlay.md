# Tarefa 02 - Backend Go Do Overlay

## Contexto
O backend Go já existe, mas ainda precisa ser tratado como o núcleo real do estado compartilhado.

## Objetivo
Fechar o backend Go como fonte de verdade do estado compartilhado do overlay e da sessão.

## O Que Existe Hoje
- Rotas HTTP e WebSocket já implementadas.
- Sessões em memória já existem.
- O último overlay por sessão já é guardado.

## O que falta
- Garantir que `/api/session`, `/api/event`, `/api/rooms`, `/ws` e `/overlay` estejam estáveis.
- Servir o overlay do diretório correto em produção e desenvolvimento.
- Manter o último overlay por sessão em memória.
- Reenviar o estado correto quando o OBS reconectar.

## Riscos
- Servir o overlay de caminho errado em dev ou build.
- Perder o estado da sessão na reconexão.
- Misturar responsabilidades de transporte e captura.

## Entregas
- Resposta consistente para health, session e rooms.
- Overlay e WebSocket funcionando por `sessionId`.
- Backend pronto para receber eventos do portal e distribuir ao OBS.

## Pronto quando
- Uma sessão não interfere na outra.
- O overlay volta após reconexão sem reconfiguração manual.
- O backend continua simples, sem assumir captura de chat.

## Testes E Validação
- `go test ./...`
- GET em `/health`
- POST em `/api/event`
- GET em `/api/session?session=...`
- conexão em `/ws?session=...`

## Assunções
- O estado fica em memória nesta versão.
- Persistência futura é opcional e não bloqueia a entrega atual.
