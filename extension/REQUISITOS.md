# Requisitos e Regras de Negócio da Extensão

## Visão Geral
A extensão "Portal do Streamer - Eloh" captura mensagens de chat ao vivo de múltiplas plataformas (YouTube, Twitch, Kick, etc.), normaliza os eventos e os envia para o portal e o backend Go.

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

## Pontos de Melhoria/Simplificação
- Revisar necessidade de suporte a todas as plataformas listadas.
- Modernizar UI das opções.
- Padronizar nomes e comentários para facilitar manutenção.
- Verificar redundância entre scripts de sources.

## Estrutura de Arquivos
- `manifest.json`: Configuração da extensão, permissões e scripts.
- `index.html`: Overlay visual legado para OBS.
- `main.css`: Estilos do overlay e opções.
- `settings/options.html` & `options.js`: Página de opções e lógica de configuração.
- `sources/`: Scripts para cada plataforma suportada.

---
Este documento deve ser revisado periodicamente para refletir mudanças na arquitetura ou regras de negócio.
