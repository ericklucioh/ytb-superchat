# Task 19 - blindar o overlay contra iframe cross-origin

## Status
Concluído

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
`src/overlay/overlay.js` acessa `window.parent.location` diretamente. Em iframe cross-origin isso pode lancar excecao antes do bootstrap terminar.

## Objetivo
Evitar que o overlay quebre quando for aberto em iframe, preview ou qualquer contexto com origem diferente.

## Checklist
- [x] envolver a deteccao de iframe em uma checagem segura
- [x] remover qualquer acesso direto a `window.parent.location` sem protecao
- [x] manter a logica de resize e conexao do socket funcionando
- [x] testar o overlay em janela normal e em iframe same-origin
- [x] testar o overlay em iframe cross-origin ou simular a condicao

## Criterios de aceite
- [x] o overlay carrega mesmo quando embedado em origem diferente
- [x] a conexao do socket nao e bloqueada por erro de acesso ao parent
- [x] o comportamento atual em iframe continua previsivel
- [x] nao ha regressao no resize e na renderizacao de mensagens
- [x] o bootstrap do overlay nao depende de leitura direta de `window.parent.location`
