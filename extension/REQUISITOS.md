# Requisitos e Regras de Negócio da Extensão

## Contexto
Este documento descreve o papel da extensão dentro da arquitetura nova.

## Objetivo
Garantir que a extensão fique limitada à captura, normalização e envio de eventos ao portal/backend.

## Visão Geral
A extensão "Portal do Streamer - Eloh" captura mensagens de chat ao vivo de múltiplas plataformas (YouTube, Twitch, Kick, etc.), normaliza os eventos e os envia para o portal e o backend Go.

## O Que Existe Hoje
- Captura em pop-outs e chats em páginas suportadas
- Configuração em `chrome.storage.sync`
- Bridge para o portal já existente
- Overlay legado ainda presente como histórico

## Funcionalidades Principais
- Captura automática de mensagens de chat em popups/live_chat das plataformas suportadas.
- Armazena configurações no chrome.storage.sync.
- Permite customização visual (cores, fontes, layout) via página de opções.
- Gera e gerencia um streamID único para cada sessão/stream.
- Fornece dados para o overlay visual do OBS, servido pelo backend Go.
- Suporte a múltiplas plataformas via scripts dedicados.

## Regras de Negócio
- Só captura chats em popups/live_chat das plataformas suportadas.
- Só lê/escreve no storage as propriedades configuradas.
- Overlay e opções respeitam restrições de cor (ex: evitar preto puro para chroma key).
- Integração com portal: o portal recebe os eventos da extensão e dispara o overlay no backend Go.
- Permissões restritas às URLs das plataformas e do portal.

## O Que Precisa Mudar
- O overlay não deve ser tratado como responsabilidade principal da extensão.
- O renderer legado não deve ser o caminho ativo.
- A extensão precisa apenas entregar eventos normalizados ao portal/backend.

## Pontos de Melhoria/Simplificação
- Revisar necessidade de suporte a todas as plataformas listadas.
- Modernizar UI das opções.
- Padronizar nomes e comentários para facilitar manutenção.
- Verificar redundância entre scripts de sources.

## Critério De Pronto
- A extensão deixa claro que captura apenas.
- O overlay é servido pelo backend Go.
- O fluxo de chat não depende de terceiro.

## Estrutura de Arquivos
- `manifest.json`: Configuração da extensão, permissões e scripts.
- `index.html`: Overlay visual legado para OBS.
- `main.css`: Estilos do overlay e opções.
- `settings/options.html` & `options.js`: Página de opções e lógica de configuração.
- `sources/`: Scripts para cada plataforma suportada.

---
## Assunções
- As APIs oficiais entram gradualmente depois.
- O overlay legado permanece apenas como histórico até deixar de ser necessário.
- O storage da extensão segue para configurações, não para estado autoritativo do overlay.
