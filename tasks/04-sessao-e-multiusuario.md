# Tarefa 04 - Sessao E Multiusuario

## Contexto
O sistema precisa suportar mais de um fluxo ativo ao mesmo tempo sem confundir estado.

## Objetivo
Deixar explícito e implementado o modelo de isolamento por `sessionId`, suportando vários usuários e sessões ao mesmo tempo.

## O Que Existe Hoje
- Sessões em memória no backend Go.
- `sessionId` já é usado como chave de fluxo.
- O portal já conversa com o backend usando a sessão atual.

## O que falta
- Garantir isolamento completo entre sessões.
- Separar o que é estado local de UI do que é estado autoritativo do backend.
- Validar o fluxo com mais de uma sessão ativa.
- Manter o contrato de sessão simples para o portal, a extensão e o OBS.

## Riscos
- Um cliente sobrescrever o overlay de outra sessão.
- O portal guardar como verdade algo que deveria estar no backend.
- A documentação continuar misturando usuário com sessão.

## Entregas
- Sessões independentes no Go.
- Portal e overlay trabalhando com a mesma sessão sem cruzar dados.
- Base pronta para evoluir para autenticação, se necessário depois.

## Pronto quando
- Dá para abrir mais de uma sessão sem conflito.
- O estado da live fica no backend, não no browser.
- Usuário e sessão ficam conceitualmente separados.

## Testes E Validação
- Abrir duas sessões simultâneas.
- Enviar eventos diferentes para cada uma.
- Confirmar que o overlay e os eventos não se misturam.

## Assunções
- Autenticação pode entrar depois.
- O corte atual foca isolamento por sessão, não por conta.
