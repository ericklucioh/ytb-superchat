# Twitch background sweep hardening

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
O Twitch ainda usa sweep periodico sobre o documento inteiro como fallback, o que consome CPU desnecessaria quando a aba fica em segundo plano.

## Objetivo
Reduzir custo em background sem perder capacidade de recuperar mensagens perdidas.

## Checklist
- [x] manter `MutationObserver` como caminho principal
- [x] limitar frequencia e escopo do sweep de background
- [x] reduzir trabalho quando a aba estiver oculta
- [x] medir se rescans atrasados ainda sao realmente necessarios
- [x] validar recovery de DOM mutado com o minimo trabalho possivel

## Criterios de aceite
- [x] o popup do Twitch fica mais leve em background
- [x] o fallback ainda recupera nodos perdidos quando o DOM muda
- [x] nao existe varredura full-document sem justificativa
- [x] a confiabilidade de captura nao regrede
