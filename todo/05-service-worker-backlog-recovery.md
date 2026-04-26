# Service worker backlog recovery

## Prioridade
Alta

## Depende de
- nenhuma

## Problema
O worker agora carrega o backlog persistente e a deduplicacao da ponte, entao ele precisa sobreviver a restart e reload sem perder ordem.

## Objetivo
Confirmar que o replay do backlog continua correto depois de restart do service worker ou refresh da pagina.

## Checklist
- [ ] testar hidratacao de `chrome.storage.session` ou storage equivalente
- [ ] testar replay apos restart do worker
- [ ] testar reconexao do dashboard enquanto a fonte ainda envia mensagens
- [ ] verificar ordem das mensagens reapresentadas
- [ ] validar o estado apos reload total do browser

## Criterios de aceite
- [ ] eventos previamente entregues sao recuperados depois do restart
- [ ] o dashboard recebe o backlog na ordem correta
- [ ] nao fica lixo de estado apos reconnect
- [ ] o retry do worker nao duplica mensagens
