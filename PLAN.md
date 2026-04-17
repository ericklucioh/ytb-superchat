# Plano Fechado: Finalizar a Aplicação Conforme `OBJETIVO.md`

## Resumo
A aplicação termina pronta quando o fluxo inteiro estiver assim:

- o portal é a interface estática principal
- o backend Go é a fonte de verdade da sessão e do overlay
- a extensão captura e normaliza mensagens, sem ser dona do overlay
- o OBS consome `/overlay?session=...`
- múltiplas sessões funcionam ao mesmo tempo sem cruzar estado

A execução deve seguir uma ordem que evita retrabalho e conflito de contratos.

## Ordem De Execução
1. `01-overlay-canonico.md`
2. `02-backend-go-overlay.md`
3. `03-extensao-captura-apenas.md`
4. `04-sessao-e-multiusuario.md`
5. `05-docs-e-entradas.md`
6. `06-validacao-final.md`

Dependências:
- a tarefa 2 depende da 1 para o overlay ter origem canônica
- a tarefa 3 depende da 2 para a extensão já falar com o backend estável
- a tarefa 4 depende da 2 e da 3 para validar isolamento real de sessão
- a tarefa 5 depende do resultado das tarefas 1 a 4 para não documentar caminho errado
- a tarefa 6 depende de todas as anteriores

## Detalhamento Das Tarefas

### 01 - Overlay Canonico
Objetivo:
- mover o renderer do overlay para `src/overlay/`
- fazer o portal ser a origem oficial do overlay

Mudanças:
- criar a estrutura do overlay dentro de `src/overlay/`
- separar HTML, CSS, JS e assets do overlay da pasta `extension/`
- ajustar `npm run build` para publicar o overlay a partir de `src/overlay/`
- ajustar o servidor local para servir `/overlay` a partir dessa origem

Critério de pronto:
- `/overlay?session=...` abre sem depender de `extension/index.html`
- o visual do overlay continua equivalente ao atual
- o build gera `out/portal/overlay/` corretamente

Testes:
- abrir `http://localhost:8000/overlay?session=TEST`
- validar que o overlay carrega com CSS, JS e assets corretos
- validar que o build publica o mesmo conteúdo no artefato final

### 02 - Backend Go Do Overlay
Objetivo:
- consolidar o Go como fonte de verdade da sessão e do overlay

Mudanças:
- manter estáveis `/health`, `/api/session`, `/api/event`, `/api/rooms`, `/ws` e `/overlay`
- garantir que o backend sirva o overlay correto no ambiente local e no build
- manter o último overlay por sessão em memória
- preservar reconexão do OBS com reidratação do último estado
- limpar stubs e duplicações de handler

Critério de pronto:
- o backend responde com consistência para sessão, rooms, eventos e overlay
- cada sessão tem estado próprio
- reconectar o OBS não perde o overlay atual

Testes:
- `go test ./...`
- request manual em `/health`
- POST em `/api/event`
- GET em `/api/session?session=...`
- websocket em `/ws?session=...`

### 03 - Extensao Captura Apenas
Objetivo:
- retirar a responsabilidade de overlay da extensão

Mudanças:
- manter a captura das plataformas suportadas
- remover o caminho principal de overlay legado da extensão
- eliminar dependência ativa de `api.overlay.ninja`
- manter bridge e normalização de eventos
- atualizar mensagens, links e comportamento de runtime para apontar ao backend Go

Critério de pronto:
- a extensão continua capturando mensagens
- nenhum fluxo principal depende do renderer legado
- nenhum caminho principal chama host externo antigo

Testes:
- abrir popout das plataformas suportadas e confirmar captura
- confirmar que mensagens seguem para o portal
- buscar referências a `api.overlay.ninja` e confirmar que não existem no caminho principal

### 04 - Sessao E Multiusuario
Objetivo:
- garantir isolamento real por `sessionId`

Mudanças:
- tratar `sessionId` como chave de isolamento do estado
- garantir que múltiplas sessões vivam ao mesmo tempo no backend
- separar estado local de UI do estado compartilhado da sessão
- manter usuário e sessão como conceitos diferentes

Critério de pronto:
- duas sessões diferentes não misturam eventos nem overlay
- o portal e o OBS usam a sessão correta
- o backend mantém estado isolado por sessão

Testes:
- abrir duas sessões simultâneas
- enviar eventos diferentes para cada uma
- validar que o overlay de uma sessão não aparece na outra
- validar reconexão independente por sessão

### 05 - Docs E Entradas
Objetivo:
- fazer a documentação refletir o sistema real e eliminar ambiguidade

Mudanças:
- manter `OBJETIVO.md` como missão do produto
- manter `PLAN.md` como plano de execução
- atualizar `README.md`, `src/README.md`, `extension/README.md`, `ytb-go/README.md`
- remover markdowns legados que competem com o objetivo
- ajustar scripts e URLs de desenvolvimento para `/overlay`
- manter `out/` explicitamente como artefato gerado

Critério de pronto:
- ler a raiz do repo não gera contradição arquitetural
- os docs explicam o papel real de portal, extensão, backend e OBS
- os links de dev apontam para o caminho novo

Testes:
- revisar todas as referências a overlay e sessão nos markdowns
- revisar saída dos scripts de dev e abertura
- confirmar que nenhum doc principal empurra o fluxo antigo

### 06 - Validacao Final
Objetivo:
- provar que a aplicação terminou do jeito certo

Mudanças:
- rodar build e testes
- fazer smoke test completo do fluxo
- validar OBS, portal, extensão e backend juntos
- validar limpeza de overlay e reconexão
- validar múltiplas sessões em paralelo

Critério de pronto:
- `npm run build` passa
- `go test ./...` passa
- `/overlay?session=...` funciona
- o clique no portal gera overlay no OBS
- `contents: false` limpa o overlay
- múltiplas sessões coexistem sem conflito
- não existe mais dependência principal de `api.overlay.ninja`

## Critérios Globais De Aceite
A aplicação só deve ser considerada pronta quando todos estes pontos forem verdadeiros:

- o portal é o ponto principal de interface
- o backend Go controla sessão, overlay e broadcast
- a extensão é só captura e normalização
- o OBS consome o overlay servido pelo backend
- a arquitetura suporta mais de um usuário/sessão ao mesmo tempo
- a documentação descreve exatamente o que o código faz
- o fluxo legado de terceiros deixou de ser o caminho principal

## Assumptions
- o overlay visual deve permanecer equivalente ao atual
- o estado compartilhado fica no backend, não no `out/`
- a remoção do overlay legado da extensão é parte do objetivo final
- APIs oficiais podem entrar depois, sem travar o fechamento desta versão
