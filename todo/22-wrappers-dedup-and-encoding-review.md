# Task 22 - revisar wrappers duplicados e encoding de URL

## Status
Concluído e validado

## Prioridade
Baixa media

## Depende de
- `todo/18-src-overlay-url-configurable.md`

## Problema
Os wrappers `.sh` e `.ps1` de abrir portal/overlay contem duplicacao e constroem URLs sem `encode` explicito para a sessao.

## Objetivo
Reduzir ruido operacional e deixar a abertura de site e overlay mais consistente.

## Checklist
- [x] revisar duplicacao entre `open-site`, `open-streamer` e `open-overlay`
- [x] decidir se `open-streamer` permanece como alias ou deve ser removido/documentado
- [x] aplicar encoding seguro na session quando a URL for montada
- [x] manter os wrappers simples para uso local

## Criterios de aceite
- [x] nao existe ambiguidade entre os wrappers
- [x] a session vai para a URL com encoding apropriado
- [x] o fluxo local continua simples de executar
