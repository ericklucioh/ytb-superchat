# Watchdog de Reconexão dos Popups

## Objetivo

Reduzir a dependência de clicar manualmente nos popups de chat da Twitch e do YouTube para “acordar” a captura quando o navegador coloca a aba em segundo plano.

Hoje o fluxo depende de:

- popup do chat aberto
- extensão ativa na aba
- DOM da página ainda sendo observado
- navegador não ter throttling pesado demais na aba

Quando o popup fica em segundo plano, o Chrome pode reduzir prioridade, atrasar timers e enfraquecer observers. Isso faz parecer que “o site travou”, quando na prática a aba ficou subalimentada.

## Ideia

Adicionar um watchdog leve que detecta quando o popup deixou de reportar atividade e tenta recuperar a sessão automaticamente.

## O Que O Watchdog Deve Detectar

O sinal de saúde não deve ser “existem mensagens novas”, porque o chat pode ficar quieto sem estar quebrado.

Sinais melhores:

- heartbeat da página
- heartbeat do bridge local
- última mutação do DOM observada
- última mensagem realmente enviada para o dashboard

## Estratégia Recomendada

### 1. Heartbeat leve

A cada 10 a 15 segundos, o popup manda um sinal curto de vida.

Esse sinal pode ser algo como:

- `session`
- `platform`
- timestamp atual
- estado resumido do bridge

### 2. Estado no service worker

O `service_worker` guarda:

- última vez que recebeu heartbeat por `session`
- última vez que recebeu mensagem real
- portas abertas do source e do dashboard

### 3. Janela de timeout

Se a sessão ficar sem heartbeat por 30 a 45 segundos:

- tentar reconectar o bridge
- reanexar a sessão
- se necessário, sinalizar para a aba do popup dar reload

## Fluxo Proposto

1. O popup abre.
2. A extensão conecta a sessão.
3. O popup envia heartbeat periódico.
4. O dashboard recebe mensagens normalmente.
5. Se o popup cair em background pesado, o watchdog percebe a falta de heartbeat.
6. O watchdog tenta recuperação automática.
7. Se falhar, ele força um reload da aba ou marca a sessão como morta.

## Benefícios

- menos cliques manuais
- menos necessidade de “acordar” o popup
- recuperação automática após throttling
- melhor experiência no uso diário

## Limites

- não elimina o throttling do navegador
- não substitui uma arquitetura sem dependência do DOM
- precisa de thresholds bem calibrados para não recarregar aba saudável em chat silencioso

## Sugestão De Implementação

### Extensão

- adicionar `sendHeartbeat(session)`
- registrar `lastSeenAt` por sessão
- monitorar timeout no `service_worker`
- emitir `recover` ou `reload` quando necessário

### Popup Twitch/YouTube

- enviar heartbeat com intervalo fixo
- atualizar o heartbeat quando houver mutação relevante do chat
- reconectar o bridge ao detectar perda de sessão

### Dashboard

- não precisa de polling
- só deve continuar ouvindo a sessão atual

## Parâmetros Recomendados

- heartbeat: 10s a 15s
- timeout de alerta: 30s
- timeout de recuperação: 45s
- retry de reconnect: com backoff leve

## Critério De Sucesso

O sistema está bom quando:

- o popup pode ficar em segundo plano sem perder mensagens por longos períodos
- o dashboard continua recebendo eventos sem intervenção manual
- clicar na aba deixa de ser necessário para “destravar” a captura

## Próximo Passo

Implementar primeiro só o heartbeat e o rastreamento de `lastSeenAt`, sem reload automático agressivo. Depois disso, adicionar a recuperação automática com cuidado.
