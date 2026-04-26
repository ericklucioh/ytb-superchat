# Task 20 - blindar a deteccao de iframe no overlay

## Status
Concluído

## Prioridade
Alta

## Depende de
- `todo/19-src-overlay-iframe-crossorigin-guard.md`

## Problema
`src/overlay/overlay.js` tenta ler `window.parent.location` diretamente e pode quebrar o bootstrap em contexto cross-origin.

## Objetivo
Detectar iframe de forma segura sem depender de acesso direto ao parent.

## Checklist
- [x] remover leitura direta de `window.parent.location`
- [x] envolver a deteccao em `try/catch` ou abordagem equivalente segura
- [x] manter o resize e a conexao do overlay funcionando
- [x] testar overlay em janela normal e em iframe cross-origin

## Criterios de aceite
- [x] o overlay carrega mesmo em origem diferente
- [x] o bootstrap nao e interrompido por erro de access denied
- [x] o comportamento em iframe continua previsivel
