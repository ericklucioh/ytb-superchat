# Plano de Implementação: Portal Estático + Backend Go Como Fonte de Verdade

## Resumo
O portal continua sendo a camada estática de interface.
O backend Go vira a fonte de verdade do estado compartilhado.
A extensão fica só com captura e normalização de chat.
O OBS consome apenas a URL do overlay servida pelo backend.

Isso permite vários usuários e várias sessões no mesmo sistema, desde que cada fluxo seja isolado por `sessionId`.

## Mudanças de Implementação
- **Documentação**
  - Manter `OBJETIVO.md` como definição da missão do produto.
  - Manter `PLAN.md` como plano de execução.
  - Remover os markdowns legados que competem com a arquitetura atual.

- **Modelo de responsabilidade**
  - Frontend estático:
    - renderiza dashboard e overlay
    - guarda apenas estado local de UI
    - não guarda o estado compartilhado da live
  - Backend Go:
    - mantém sessões
    - armazena o último overlay por sessão
    - distribui eventos para clientes conectados
    - expõe `/api/session`, `/api/event`, `/api/rooms`, `/ws` e `/overlay`
  - Extensão:
    - captura mensagens das plataformas
    - normaliza payload
    - envia eventos para o portal/backend
    - não é dona do overlay
  - OBS:
    - consome somente a URL do overlay
    - não conhece captura nem dashboard

- **Overlay**
  - Tirar o renderer do overlay do caminho principal da extensão.
  - Servir o overlay pelo caminho `/overlay`.
  - Fazer o Go preferir o overlay gerado pelo build do portal.
  - Remover dependência ativa de `api.overlay.ninja` no fluxo principal.

- **Multiusuário e sessão**
  - Tratar `sessionId` como chave de isolamento do estado.
  - Permitir vários usuários e sessões simultâneos no mesmo backend.
  - Garantir que cada sessão tenha:
    - eventos próprios
    - overlay próprio
    - conexão própria com OBS
  - Deixar claro que usuário e sessão não são a mesma coisa.

- **Build e scripts**
  - Manter `out/` apenas como artefato gerado.
  - Não colocar estado em `out/`.
  - Ajustar build, serve e open para:
    - gerar o site e o portal estático
    - publicar o overlay em `/overlay`
    - abrir URLs corretas em desenvolvimento

## Testes e Validação
- Validar que o build gera o site, o portal e o overlay sem quebrar o fluxo atual.
- Validar que o backend Go sobe e responde em:
  - `/health`
  - `/api/session`
  - `/api/event`
  - `/ws`
  - `/overlay`
- Validar o fluxo completo:
  - extensão captura mensagem
  - portal recebe e organiza
  - clique numa mensagem gera overlay
  - OBS recebe o overlay via backend Go
- Validar que uma sessão não interfere em outra.
- Validar que múltiplas sessões podem existir ao mesmo tempo sem conflito de estado.
- Validar que não existe mais o caminho principal dependente de `api.overlay.ninja`.

## Assumptions
- `out/` é somente build gerado, nunca fonte de estado.
- O portal pode continuar estático desde que o estado compartilhado fique no backend.
- O backend Go é a fonte de verdade para sessão, overlay e broadcast.
- O objetivo é remover o overlay legado da extensão do caminho principal, não manter fallback.
- O comportamento visual do overlay deve permanecer equivalente ao atual, mudando apenas o dono da responsabilidade.
