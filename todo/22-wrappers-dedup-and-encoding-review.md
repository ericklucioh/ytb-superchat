# Task 22 - revisar wrappers duplicados e encoding de URL

## Prioridade
Baixa media

## Depende de
- `todo/18-src-overlay-url-configurable.md`

## Problema
Os wrappers `.sh` e `.ps1` de abrir portal/overlay contem duplicacao e constroem URLs sem `encode` explicito para a sessao.

## Objetivo
Reduzir ruido operacional e deixar a abertura de site e overlay mais consistente.

## Checklist
- [ ] revisar duplicacao entre `open-site`, `open-streamer` e `open-overlay`
- [ ] decidir se `open-streamer` permanece como alias ou deve ser removido/documentado
- [ ] aplicar encoding seguro na session quando a URL for montada
- [ ] manter os wrappers simples para uso local

## Criterios de aceite
- [ ] nao existe ambiguidade entre os wrappers
- [ ] a session vai para a URL com encoding apropriado
- [ ] o fluxo local continua simples de executar
