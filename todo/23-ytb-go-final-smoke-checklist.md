# ytb-go final smoke checklist

## Status
Pendente

## Prioridade
Alta

## Depende de
- `ytb-go/internal/httpapi/security.go`
- `ytb-go/internal/httpapi/runtime_env.go`
- `ytb-go/internal/ws/hub.go`
- `ytb-go/internal/ws/client.go`

## Problema
Os testes unitarios cobrem regra de negocio, mas ainda falta um fechamento manual do backend rodando de ponta a ponta.

## Objetivo
Executar a validacao final do Go em ambiente real antes de considerar o backend pronto.

## Checklist
- [ ] subir o `ytb-go` em um ambiente real
- [ ] bater em `/health`
- [ ] bater em `/api/session`
- [ ] bater em `/api/event`
- [ ] bater em `/api/rooms`
- [ ] bater em `/ws`
- [ ] bater em `/overlay`
- [ ] validar token e CORS com origem confiavel
- [ ] validar rejeicao de origem nao confiavel
- [ ] validar `X-YTB-Token`, `Authorization: Bearer` e `token` na URL
- [ ] validar comportamento com cliente lento e drops visiveis
- [ ] validar reaper de sessao inativa
- [ ] validar reinicio do processo e o contrato de estado esperado

## Criterios de aceite
- [ ] o backend responde como esperado em todos os endpoints principais
- [ ] auth e CORS funcionam no mundo real, nao so em teste
- [ ] drops e expurgo de sessao sao observaveis
- [ ] o contrato de restart fica comprovado manualmente
