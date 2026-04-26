# Task 17 - endurecer o servidor local contra path traversal

## Status
Concluído e validado

## Prioridade
Alta

## Depende de
- task 16, se o build usar o mesmo criterio de resolucao de paths

## Problema
O servidor em `src/scripts/serve.mjs` aceita caminhos que podem escapar da raiz do projeto e tambem pode falhar com URLs malformadas durante o decode.

## Objetivo
Garantir que o servidor local so sirva arquivos permitidos e nao exponha o filesystem fora da area esperada.

## Checklist
- [x] encapsular o decode do pathname com tratamento de erro
- [x] normalizar o path e rejeitar qualquer tentativa de sair da raiz
- [x] bloquear caminhos absolutos, `..` e variantes codificadas
- [x] manter as rotas existentes para `/`, `/portal`, `/overlay`, `/privacy` e redirects
- [x] confirmar que arquivos validos continuam servidos normalmente
- [x] testar uma URL malformada e uma tentativa de traversal

## Criterios de aceite
- [x] requests com path traversal retornam 404 ou erro controlado
- [x] caminhos validos continuam funcionando
- [x] o servidor nao quebra com URL encoding invalido
- [x] o comportamento de redirecionamento e servico dos arquivos permanece intacto
- [x] a raiz do projeto nao pode ser lida por acidente via path manipulado
