# YouTube bootstrap null guard

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O observer do YouTube tenta anexar ao root imediatamente e pode falhar se o container do live chat ainda nao montou.

## Objetivo
Blindar o bootstrap contra root nulo e manter retries idempotentes.

## Checklist
- [x] adicionar guard para `observer.observe(...)`
- [x] re-tentar ate o root existir
- [x] garantir que retry nao crie observers duplicados
- [x] validar inicializacao lenta e recarregamento

## Criterios de aceite
- [x] a captura sobrevive a popup lento
- [x] container ausente nao quebra o script
- [x] retries nao duplicam observer
