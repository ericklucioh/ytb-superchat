# Tarefa 01 - Overlay Canonico

## Contexto
O overlay ainda estava preso ao legado da extensão em parte do fluxo. Esta tarefa resolve a origem canônica.

## Objetivo
Mover o renderer do overlay para `src/overlay/` e tornar o portal a origem oficial do HTML, CSS e JS do overlay.

## O Que Existe Hoje
- O overlay legado ainda vive dentro de `extension/index.html`.
- O build e o serve já conhecem o caminho `/overlay`.
- O backend Go já serve `/overlay` e procura assets gerados.

## O que falta
- Criar a pasta `src/overlay/` com a base do overlay atual.
- Separar o overlay legado da extensão do caminho principal.
- Ajustar o build para publicar o overlay no artefato do portal.
- Ajustar o servidor local para servir `/overlay` a partir da origem nova.

## Riscos
- Repetir o renderer sem manter o comportamento visual.
- Quebrar o caminho do OBS ao trocar a origem.
- Deixar dupla origem ativa entre portal e extensão.

## Entregas
- Overlay acessível em `/overlay?session=...`.
- Build gerando o overlay dentro de `out/portal/overlay/`.
- Nenhuma dependência de runtime no caminho principal apontando para `extension/index.html`.

## Pronto quando
- O overlay abre sozinho pelo portal.
- O OBS consegue usar a URL nova sem mudança de comportamento visual.
- O caminho da extensão fica só como legado.

## Testes E Validação
- Abrir `/overlay?session=TEST` e confirmar carregamento.
- Validar assets, CSS e JS do overlay.
- Validar que o build contém a mesma origem.

## Assunções
- O visual atual é o baseline.
- O renderer legado só sai do caminho principal quando o novo estiver estável.
