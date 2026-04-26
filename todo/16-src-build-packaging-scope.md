# Task 16 - limitar o build ao que vai para producao

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O `src/scripts/build.mjs` copia quase toda a raiz do repositorio para `out/`, o que pode vazar diretorios internos, inflar o artefato e confundir o deploy.

## Objetivo
Publicar apenas o site necessario, mantendo portal, overlay e arquivos estaticos esperados.

## Checklist
- [ ] revisar a estrategia de copia em `src/scripts/build.mjs`
- [ ] substituir a copia ampla por uma lista permitida de arquivos e diretorios
- [ ] bloquear `extension/`, `ytb-go/`, `todo/` e outros diretorios internos do artefato
- [ ] manter os caminhos publicados funcionando: `/`, `/portal`, `/overlay` e `runtime-env.js`
- [ ] confirmar que o zip da extensao continua sendo gerado sem duplicar a arvore inteira do projeto
- [ ] validar o conteudo de `out/` depois do build

## Criterios de aceite
- [ ] `out/` nao inclui diretorios internos do repo sem necessidade
- [ ] o site continua abrindo normalmente apos o build
- [ ] o overlay continua acessivel no artefato final
- [ ] o zip da extensao continua sendo gerado no fluxo correto
- [ ] o tamanho final do build fica coerente com um site estatico, nao com a raiz inteira do repo
