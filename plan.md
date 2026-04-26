
  # Twitch parity com o YouTube em background, late-mount e recovery

  ## Status
  Pendente

  ## Prioridade
  Alta

  ## Depende de
  - `extension/sources/youtube.js`
  - `extension/sources/twitch.js`
  - `extension/sources/local-chat-bridge.js`
  - `extension/service_worker.js`
  - `src/site/chat-bridge.js`
  - `src/site/streamer-app.js`

  ## Problema
  O fluxo da Twitch ainda perde robustez quando a aba fica em segundo plano, quando o popout monta tarde ou quando o chat precisa se recuperar de reload/
  reconnect. O YouTube já tem esse comportamento mais maduro.

  ## Objetivo
  Levar a Twitch ao mesmo nível de estabilidade do YouTube em:
  - bootstrap tardio
  - execução em background
  - recuperação após reload
  - recuperação após reconexão
  - continuidade sem perda, duplicação ou atraso perceptível

  ## Checklist
  - [ ] portar para a Twitch a mesma tolerância do YouTube quando o container ainda não existe
  - [ ] tornar o bootstrap do observer da Twitch idempotente e seguro para late-mount
  - [ ] reduzir a dependência do sweep como mecanismo principal de recuperação
  - [ ] validar que a Twitch não “desaparece” nem “descarrega” quando a aba fica em segundo plano
  - [ ] validar que o fluxo continua ativo após alternar visibilidade da aba
  - [ ] validar reload da aba sem perda de mensagens
  - [ ] validar reconnect sem duplicação de mensagens
  - [ ] validar que o portal continua renderizando a mesma sessão enquanto a aba da Twitch está oculta
  - [ ] registrar se ainda existe atraso, lacuna ou replay indevido em background

  ## Critérios de aceite
  - [ ] Twitch e YouTube se comportam de forma equivalente em tab visível e em background
  - [ ] mensagens da Twitch não somem quando o popout é ocultado
  - [ ] mensagens da Twitch não ficam atrasadas de forma perceptível após voltar ao foco
  - [ ] reload e reconnect não causam perda ou duplicação
  - [ ] o comportamento novo fica coberto por smoke/manual e, se fizer sentido, por teste automatizado
