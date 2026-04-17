# Tarefa 01 - Overlay Canonico

## Objetivo
Mover o renderer do overlay para `src/overlay/` e tornar o portal a origem oficial do HTML, CSS e JS do overlay.

## O que falta
- Criar a pasta `src/overlay/` com a base do overlay atual.
- Separar o overlay legado da extensão do caminho principal.
- Ajustar o build para publicar o overlay no artefato do portal.
- Ajustar o servidor local para servir `/overlay` a partir da origem nova.

## Entregas
- Overlay acessível em `/overlay?session=...`.
- Build gerando o overlay dentro de `out/portal/overlay/`.
- Nenhuma dependência de runtime no caminho principal apontando para `extension/index.html`.

## Pronto quando
- O overlay abre sozinho pelo portal.
- O OBS consegue usar a URL nova sem mudança de comportamento visual.
- O caminho da extensão fica só como legado.
