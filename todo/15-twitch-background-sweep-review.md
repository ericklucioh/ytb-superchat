# Twitch background sweep review

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
O fallback de Twitch ainda roda sweep periodico no documento inteiro em background, o que pode ser caro em abas longas.

## Objetivo
Reduzir o trabalho em background ao minimo necessario para confiabilidade.

## Checklist
- [x] reavaliar se o sweep de 15s ainda e necessario
- [x] reduzir o escopo do sweep ou remove-lo se der para confiar no observer
- [x] medir custo de rescans atrasados
- [x] validar abas long-lived em background

## Criterios de aceite
- [x] background usa o minimo de trabalho necessario
- [x] nao existe full-document sweep sem justificativa real
- [x] a confiabilidade de captura continua aceitavel
