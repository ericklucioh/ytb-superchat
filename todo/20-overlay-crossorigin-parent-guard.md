# Task 20 - blindar a deteccao de iframe no overlay

## Prioridade
Alta

## Depende de
- `todo/19-src-overlay-iframe-crossorigin-guard.md`

## Problema
`src/overlay/overlay.js` tenta ler `window.parent.location` diretamente e pode quebrar o bootstrap em contexto cross-origin.

## Objetivo
Detectar iframe de forma segura sem depender de acesso direto ao parent.

## Checklist
- [ ] remover leitura direta de `window.parent.location`
- [ ] envolver a deteccao em `try/catch` ou abordagem equivalente segura
- [ ] manter o resize e a conexao do overlay funcionando
- [ ] testar overlay em janela normal e em iframe cross-origin

## Criterios de aceite
- [ ] o overlay carrega mesmo em origem diferente
- [ ] o bootstrap nao e interrompido por erro de access denied
- [ ] o comportamento em iframe continua previsivel
