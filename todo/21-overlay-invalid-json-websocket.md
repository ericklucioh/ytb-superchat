# Task 21 - proteger o overlay contra payload invalido no websocket

## Status
Concluído

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
`src/overlay/overlay.js` faz `JSON.parse(event.data)` sem protecao. Um payload invalido pode derrubar o handler do socket.

## Objetivo
Fazer o overlay ignorar mensagens invalidas sem perder a conexao inteira.

## Checklist
- [x] envolver o parse do payload em tratamento de erro
- [x] ignorar mensagens nao JSON sem quebrar o fluxo
- [x] manter logs suficientes para diagnostico
- [x] validar o comportamento com payload valido e invalido

## Criterios de aceite
- [x] uma mensagem invalida nao derruba o overlay
- [x] o socket continua operando apos payload ruim
- [x] o erro fica observavel para suporte
