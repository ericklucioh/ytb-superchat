# Tarefa 05 - Docs E Entradas

## Contexto
Os markdowns e os scripts de dev ainda precisam falar a mesma língua que a arquitetura nova.

## Objetivo
Deixar a documentação e os pontos de entrada alinhados com a arquitetura nova.

## O Que Existe Hoje
- `README.md`, `PLAN.md` e `OBJETIVO.md` já foram alinhados parcialmente.
- `src/`, `extension/` e `ytb-go/` já têm documentação própria.
- Ainda havia markdown legado competindo com o objetivo.

## O que falta
- Revisar `README.md`, `src/README.md`, `extension/README.md`, `ytb-go/README.md`, `PLAN.md` e `OBJETIVO.md`.
- Remover documentação legada da raiz que compete com o objetivo.
- Garantir que scripts e URLs de desenvolvimento mostrem `/overlay` e não o caminho antigo.
- Manter `out/` como artefato gerado, nunca como origem.

## Riscos
- Uma README contradizer outra.
- Script de desenvolvimento continuar sugerindo caminho antigo.
- Documentação mencionar overlay como responsabilidade da extensão.

## Entregas
- Documentação canônica e coerente.
- Mensagens de dev apontando para os caminhos corretos.
- Nenhuma instrução antiga empurrando o usuário para o fluxo legado.

## Pronto quando
- Ler os markdowns da raiz não gera conflito de arquitetura.
- O usuário entende qual é o papel de portal, backend, extensão e OBS.
- A estrutura do repo reflete o produto real.

## Testes E Validação
- Revisão cruzada dos markdowns da raiz.
- Revisão de URLs e comandos de dev.
- Conferência de referências a overlay legado e host externo.

## Assunções
- Os markdowns devem ser referência prática, não texto decorativo.
- A clareza para outro implementador vale mais que concisão extrema.
