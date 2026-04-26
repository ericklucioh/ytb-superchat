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
- [ ] manter `MutationObserver` como caminho principal
- [ ] limitar frequencia e escopo do sweep de background
- [ ] reduzir trabalho quando a aba estiver oculta
- [ ] medir se rescans atrasados ainda sao realmente necessarios
- [ ] validar recovery de DOM mutado com o minimo trabalho possivel

## Criterios de aceite
- [ ] o popup do Twitch fica mais leve em background
- [ ] o fallback ainda recupera nodos perdidos quando o DOM muda
- [ ] nao existe varredura full-document sem justificativa
- [ ] a confiabilidade de captura nao regrede
