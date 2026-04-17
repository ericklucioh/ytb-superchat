# YTB Go Server

Servidor local em Go para manter sessão, overlay e broadcast em tempo real.

- `cmd/ytb-go`: ponto de entrada
- `internal/httpapi`: rotas HTTP e overlay
- `internal/session`: estado por sessão
- `internal/ws`: WebSocket por sala

O binário serve o overlay do OBS, recebe eventos do portal e mantém o último overlay por sessão em memória.
