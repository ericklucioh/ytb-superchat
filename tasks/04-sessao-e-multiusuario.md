# Tarefa 04 - Sessao E Multiusuario

## Objetivo
Deixar explícito e implementado o modelo de isolamento por `sessionId`, suportando vários usuários e sessões ao mesmo tempo.

## O que falta
- Garantir isolamento completo entre sessões.
- Separar o que é estado local de UI do que é estado autoritativo do backend.
- Validar o fluxo com mais de uma sessão ativa.
- Manter o contrato de sessão simples para o portal, a extensão e o OBS.

## Entregas
- Sessões independentes no Go.
- Portal e overlay trabalhando com a mesma sessão sem cruzar dados.
- Base pronta para evoluir para autenticação, se necessário depois.

## Pronto quando
- Dá para abrir mais de uma sessão sem conflito.
- O estado da live fica no backend, não no browser.
- Usuário e sessão ficam conceitualmente separados.
