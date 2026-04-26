# Task 18 - remover URL hardcoded do link de overlay

## Problema
`src/site/streamer-app.js` monta o link do overlay com dominio fixo e `http`, o que quebra dev, staging e qualquer instancia fora do host atual.

## Objetivo
Tornar a URL do overlay configuravel e derivada do ambiente atual sempre que possivel.

## Escopo
- substituir o dominio fixo em `buildOverlayUrl()`
- priorizar `runtime-env.js`, `window.location` ou configuracao salva antes de cair num fallback
- preservar a compatibilidade com o fluxo atual de copiar overlay
- evitar forcar `http` quando o ambiente exigir outro esquema

## Critérios de aceite
- o link copiado funciona em localhost
- o link copiado funciona em deploys diferentes do dominio atual
- o fluxo de copia continua simples para o usuario
- nao existe mais dependencia obrigatoria de `chat.ericklucioh.com`
