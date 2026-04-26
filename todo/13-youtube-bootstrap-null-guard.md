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
- [ ] adicionar guard para `observer.observe(...)`
- [ ] re-tentar ate o root existir
- [ ] garantir que retry nao crie observers duplicados
- [ ] validar inicializacao lenta e recarregamento

## Criterios de aceite
- [ ] a captura sobrevive a popup lento
- [ ] container ausente nao quebra o script
- [ ] retries nao duplicam observer
