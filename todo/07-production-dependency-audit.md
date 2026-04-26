# Production dependency audit

## Prioridade
Media alta

## Depende de
- `todo/02-twitch-remove-avatar-network-from-critical-path.md`
- `todo/18-src-overlay-url-configurable.md`

## Problema
A captura e a publicacao ainda podem depender de servicos externos sem necessidade, o que aumenta chance de atraso e falha.

## Objetivo
Inventariar e classificar chamadas externas, removendo as que estiverem no caminho critico.

## Checklist
- [ ] listar chamadas HTTP feitas pela extensao
- [ ] listar chamadas HTTP feitas pelo portal e pela overlay
- [ ] classificar cada chamada como critica, opcional ou debug
- [ ] remover ou rebaixar qualquer chamada que possa atrasar entrega de mensagem
- [ ] documentar o que restou como dependencia externa aceitavel

## Criterios de aceite
- [ ] o caminho de captura nao depende de terceiros sem necessidade
- [ ] qualquer rede restante e claramente opcional
- [ ] o impacto de cada dependencia fica documentado para producao
