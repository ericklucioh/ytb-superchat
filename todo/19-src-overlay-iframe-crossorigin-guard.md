# Task 19 - blindar o overlay contra iframe cross-origin

## Problema
`src/overlay/overlay.js` acessa `window.parent.location` diretamente. Em iframe cross-origin isso pode lancar excecao antes do bootstrap terminar.

## Objetivo
Evitar que o overlay quebre quando for aberto em iframe, preview ou qualquer contexto com origem diferente.

## Escopo
- envolver a deteccao de iframe em uma checagem segura
- evitar acesso direto a `window.parent.location` sem try/catch
- manter a logica de resize e conexao do socket funcionando
- testar o overlay em janela normal e em iframe

## Critérios de aceite
- o overlay carrega mesmo quando embedado em origem diferente
- a conexao do socket nao e bloqueada por erro de acesso ao parent
- o comportamento atual em iframe continua previsivel
- nao ha regressao no resize e na renderizacao de mensagens
