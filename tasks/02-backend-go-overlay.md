# Tarefa 02 - Backend Go Do Overlay

## Objetivo
Fechar o backend Go como fonte de verdade do estado compartilhado do overlay e da sessão.

## O que falta
- Garantir que `/api/session`, `/api/event`, `/api/rooms`, `/ws` e `/overlay` estejam estáveis.
- Servir o overlay do diretório correto em produção e desenvolvimento.
- Manter o último overlay por sessão em memória.
- Reenviar o estado correto quando o OBS reconectar.

## Entregas
- Resposta consistente para health, session e rooms.
- Overlay e WebSocket funcionando por `sessionId`.
- Backend pronto para receber eventos do portal e distribuir ao OBS.

## Pronto quando
- Uma sessão não interfere na outra.
- O overlay volta após reconexão sem reconfiguração manual.
- O backend continua simples, sem assumir captura de chat.
