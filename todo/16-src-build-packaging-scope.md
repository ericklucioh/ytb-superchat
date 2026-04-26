# Task 16 - limitar o build ao que vai para producao

## Status
Concluído e validado

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O `src/scripts/build.mjs` copia quase toda a raiz do repositorio para `out/`, o que pode vazar diretorios internos, inflar o artefato e confundir o deploy.

## Objetivo
Publicar apenas o site necessario, mantendo portal, overlay e arquivos estaticos esperados.

## Checklist
- [x] revisar a estrategia de copia em `src/scripts/build.mjs`
- [x] substituir a copia ampla por uma lista permitida de arquivos e diretorios
- [x] bloquear `extension/`, `ytb-go/`, `todo/` e outros diretorios internos do artefato
- [x] manter os caminhos publicados funcionando: `/`, `/portal`, `/overlay` e `runtime-env.js`
- [x] confirmar que o zip da extensao continua sendo gerado sem duplicar a arvore inteira do projeto
- [x] validar o conteudo de `out/` depois do build

## Criterios de aceite
- [x] `out/` nao inclui diretorios internos do repo sem necessidade
- [x] o site continua abrindo normalmente apos o build
- [x] o overlay continua acessivel no artefato final
- [x] o zip da extensao continua sendo gerado no fluxo correto
- [x] o tamanho final do build fica coerente com um site estatico, nao com a raiz inteira do repo
