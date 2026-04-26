# Task 21 - proteger o overlay contra payload invalido no websocket

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
`src/overlay/overlay.js` faz `JSON.parse(event.data)` sem protecao. Um payload invalido pode derrubar o handler do socket.

## Objetivo
Fazer o overlay ignorar mensagens invalidas sem perder a conexao inteira.

## Checklist
- [ ] envolver o parse do payload em tratamento de erro
- [ ] ignorar mensagens nao JSON sem quebrar o fluxo
- [ ] manter logs suficientes para diagnostico
- [ ] validar o comportamento com payload valido e invalido

## Criterios de aceite
- [ ] uma mensagem invalida nao derruba o overlay
- [ ] o socket continua operando apos payload ruim
- [ ] o erro fica observavel para suporte
