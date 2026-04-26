# YouTube observer guard

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O bootstrap do YouTube assume que o container do chat existe imediatamente e pode falhar quando a UI ainda nao terminou de montar ou quando a estrutura do DOM muda.

## Objetivo
Garantir que a captura do YouTube so inicie quando o root do chat estiver realmente disponivel e que retries nao criem duplicidade.

## Checklist
- [ ] localizar o ponto de bootstrap do observer
- [ ] adicionar guarda para `target` nulo antes de `observer.observe(...)`
- [ ] re-tentar a conexao ate o container aparecer
- [ ] garantir que o retry seja idempotente e nao duplique observers
- [ ] validar o comportamento com popup lento e com a pagina recarregada

## Criterios de aceite
- [ ] a captura continua funcionando quando o popup do chat demora para montar
- [ ] uma mudanca de timing no DOM nao derruba o script inteiro
- [ ] nao existem observers duplicados apos retries
- [ ] o fluxo continua capturando mensagens sem intervention manual
