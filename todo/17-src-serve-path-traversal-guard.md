# Task 17 - endurecer o servidor local contra path traversal

## Problema
O servidor em `src/scripts/serve.mjs` aceita caminhos que podem escapar da raiz do projeto e tambem pode falhar com URLs malformadas durante o decode.

## Objetivo
Garantir que o servidor local so sirva arquivos permitidos e nao exponha o filesystem fora da area esperada.

## Escopo
- validar e sanitizar `pathname` antes de resolver arquivos
- bloquear `..`, caminhos absolutos e outros escapes de raiz
- tratar erros de `decodeURIComponent` sem derrubar a requisicao
- manter as rotas existentes para `/`, `/portal`, `/overlay`, `/privacy` e redirects

## Critérios de aceite
- requests com path traversal retornam 404 ou erro controlado
- caminhos validos continuam funcionando
- o servidor nao quebra com URL encoding invalido
- o comportamento de redirecionamento e servico dos arquivos permanece intacto
