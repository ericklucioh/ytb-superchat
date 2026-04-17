# Plano de Implementação: Portal Estático + Backend Go Como Fonte de Verdade

## Contexto
O repositório ainda precisava de uma separação clara entre:
- interface estática
- estado compartilhado
- captura de chat
- exibição no OBS

O problema principal era o overlay ainda aparecer como responsabilidade da extensão em parte da documentação e do fluxo. A meta deste plano é tornar a arquitetura inequívoca e implementável sem decisões escondidas.

## Objetivo
Deixar o sistema assim:
- o portal é a interface estática principal
- o backend Go é a fonte de verdade do estado compartilhado
- a extensão captura e normaliza mensagens
- o OBS consome apenas `/overlay?session=...`
- múltiplas sessões podem existir ao mesmo tempo sem cruzar estado

## O Que Existe Hoje
- O portal já centraliza a visualização do chat e o clique na mensagem.
- O backend Go já possui rotas de sessão, evento e WebSocket.
- A extensão ainda carrega partes do overlay legado e ainda contém referências históricas ao fluxo antigo.
- A documentação da raiz já foi alinhada parcialmente, mas ainda precisava de detalhamento operacional.

## O Que Precisa Mudar

### Documentação
- `OBJETIVO.md` continua como missão do produto.
- `PLAN.md` vira um plano de execução fechado.
- Os markdowns legados da raiz deixam de competir com a arquitetura atual.

### Modelo de responsabilidade
- Frontend estático:
  - renderiza dashboard e overlay
  - guarda apenas estado local de UI
  - não guarda estado compartilhado da live
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

### Overlay
- Tirar o renderer do overlay do caminho principal da extensão.
- Servir o overlay pelo caminho `/overlay`.
- Fazer o Go preferir o overlay gerado pelo build do portal.
- Remover dependência ativa de `api.overlay.ninja` no fluxo principal.

### Multiusuário e sessão
- Tratar `sessionId` como chave de isolamento do estado.
- Permitir vários usuários e sessões simultâneos no mesmo backend.
- Garantir que cada sessão tenha:
  - eventos próprios
  - overlay próprio
  - conexão própria com OBS
- Deixar claro que usuário e sessão não são a mesma coisa.

### Build e scripts
- Manter `out/` apenas como artefato gerado.
- Não colocar estado em `out/`.
- Ajustar build, serve e open para:
  - gerar o site e o portal estático
  - publicar o overlay em `/overlay`
  - abrir URLs corretas em desenvolvimento

## Critério De Pronto
- O overlay abre em `/overlay?session=...` sem depender da extensão como origem.
- O backend Go serve sessão, rooms, eventos e overlay de forma consistente.
- O portal e a extensão continuam funcionando juntos.
- O OBS recebe o overlay pelo backend Go.
- Duas sessões ativas não interferem uma na outra.
- Não existe mais caminho principal dependente de `api.overlay.ninja`.

## Testes E Validação
- `npm run build` gera o site, o portal e o overlay corretamente.
- `go test ./...` passa no backend Go.
- O backend responde em:
  - `/health`
  - `/api/session`
  - `/api/event`
  - `/ws`
  - `/overlay`
- Fluxo manual:
  - extensão captura mensagem
  - portal recebe e organiza
  - clique numa mensagem gera overlay
  - OBS recebe o overlay via backend Go
- Fluxo paralelo:
  - duas sessões diferentes recebem eventos diferentes
  - uma sessão não altera a outra

## Assunções
- `out/` é somente build gerado, nunca fonte de estado.
- O portal pode continuar estático desde que o estado compartilhado fique no backend.
- O backend Go é a fonte de verdade para sessão, overlay e broadcast.
- O objetivo é remover o overlay legado da extensão do caminho principal, não manter fallback.
- O comportamento visual do overlay deve permanecer equivalente ao atual, mudando apenas o dono da responsabilidade.
