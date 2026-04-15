# Requisitos do Projeto

## Funcionais
- Extensão Chrome extrai mensagens dos popups de chat (YouTube, Twitch, Kick) e salva no storage local
- Portal lê mensagens do storage local
- Ao clicar em uma mensagem, conecta na API para sincronizar com overlay (OBS)
- API em Go serve apenas para atualizar o overlay
- Interface estática e leve (JS Vanilla)

## Não Funcionais
- Baixa latência na atualização dos chats
- Facilidade de configuração para o streamer
- Compatibilidade com múltiplos navegadores
- Segurança na manipulação dos dados de chat

## Fora de Escopo
- Novas funcionalidades além de melhorias e integrações