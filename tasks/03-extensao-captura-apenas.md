# Tarefa 03 - Extensao So De Captura

## Objetivo
Limpar a extensão para que ela capture e normalize chat, sem ser dona do overlay.

## O que falta
- Remover o renderer ativo do overlay da extensão.
- Eliminar o fluxo principal dependente de `api.overlay.ninja`.
- Manter apenas os scripts de captura e bridge.
- Atualizar os links e mensagens da extensão para apontar ao overlay do backend.

## Entregas
- Extensão focada em captura de mensagens.
- Compatibilidade com as plataformas já suportadas.
- Nenhum caminho novo usando overlay de terceiros.

## Pronto quando
- A extensão ainda captura as mensagens suportadas.
- O overlay não depende mais do renderer legado para funcionar.
- O runtime principal não referencia host externo como caminho ativo.
