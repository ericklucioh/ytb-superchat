# Task 16 - limitar o build ao que vai para producao

## Problema
O `src/scripts/build.mjs` copia quase toda a raiz do repositório para `out/`, o que pode vazar diretorios internos, inflar o artefato e confundir o deploy.

## Objetivo
Fazer o build publicar apenas o site necessario, mantendo o portal, overlay e arquivos estaticos esperados.

## Escopo
- revisar a estrategia de copia em `src/scripts/build.mjs`
- restringir o conteudo gerado em `out/` ao que realmente precisa ir para producao
- garantir que `extension/`, `ytb-go/`, `todo/` e outros diretorios internos nao sejam empacotados por acidente
- manter os caminhos publicados funcionando: `/`, `/portal`, `/overlay` e `runtime-env.js`

## Critérios de aceite
- `out/` nao inclui diretorios internos do repo sem necessidade
- o site continua abrindo normalmente apos o build
- o overlay continua acessivel no artefato final
- o zip da extensao continua sendo gerado no fluxo correto, sem duplicar a arvore inteira do projeto
