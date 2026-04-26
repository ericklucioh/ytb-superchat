# Task 18 - remover URL hardcoded do link de overlay

## Status
Concluído

## Prioridade
Media alta

## Depende de
- nenhuma

## Problema
`src/site/streamer-app.js` monta o link do overlay com dominio fixo e `http`, o que quebra dev, staging e qualquer instancia fora do host atual.

## Objetivo
Tornar a URL do overlay configuravel e derivada do ambiente atual sempre que possivel.

## Checklist
- [x] substituir o dominio fixo em `buildOverlayUrl()`
- [x] priorizar `runtime-env.js`, `window.location` ou configuracao salva antes de cair num fallback
- [x] respeitar o protocolo atual quando possivel
- [x] manter o fluxo de copiar overlay simples para o usuario
- [x] confirmar o comportamento em localhost e em um host alternativo
- [x] remover a dependencia obrigatoria de `chat.ericklucioh.com`

## Criterios de aceite
- [x] o link copiado funciona em localhost
- [x] o link copiado funciona em deploys diferentes do dominio atual
- [x] o fluxo de copia continua simples para o usuario
- [x] nao existe mais dependencia obrigatoria de um dominio fixo
- [x] o esquema nao fica preso em `http` sem necessidade
