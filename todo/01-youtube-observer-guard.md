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
- [x] localizar o ponto de bootstrap do observer
- [x] adicionar guarda para `target` nulo antes de `observer.observe(...)`
- [x] re-tentar a conexao ate o container aparecer
- [x] garantir que o retry seja idempotente e nao duplique observers
- [x] validar o comportamento com popup lento e com a pagina recarregada

## Criterios de aceite
- [x] a captura continua funcionando quando o popup do chat demora para montar
- [x] uma mudanca de timing no DOM nao derruba o script inteiro
- [x] nao existem observers duplicados apos retries
- [x] o fluxo continua capturando mensagens sem intervention manual
