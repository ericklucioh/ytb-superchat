# Tarefa 03 - Extensao So De Captura

## Contexto
A extensão ainda carrega legado do overlay e referências antigas que precisam sair do caminho principal.

## Objetivo
Limpar a extensão para que ela capture e normalize chat, sem ser dona do overlay.

## O Que Existe Hoje
- Captura por plataforma já pronta em vários scripts.
- Bridge local já encaminha eventos para o portal.
- O runtime compartilhado ainda tinha compatibilidade histórica com host externo.

## O que falta
- Remover o renderer ativo do overlay da extensão.
- Eliminar o fluxo principal dependente de `api.overlay.ninja`.
- Manter apenas os scripts de captura e bridge.
- Atualizar os links e mensagens da extensão para apontar ao overlay do backend.

## Riscos
- Remover compatibilidade demais e quebrar uma captura já estável.
- Deixar referência antiga em script secundário.
- Criar diferença entre o que o README diz e o que o runtime faz.

## Entregas
- Extensão focada em captura de mensagens.
- Compatibilidade com as plataformas já suportadas.
- Nenhum caminho novo usando overlay de terceiros.

## Pronto quando
- A extensão ainda captura as mensagens suportadas.
- O overlay não depende mais do renderer legado para funcionar.
- O runtime principal não referencia host externo como caminho ativo.

## Testes E Validação
- Abrir chats suportados e observar captura.
- Confirmar envio ao portal/backend.
- Buscar referências a host externo no caminho principal e não encontrar.

## Assunções
- A extensão segue existindo porque a migração para APIs oficiais é gradual.
- O overlay legado pode sobreviver como histórico até a nova origem dominar.
