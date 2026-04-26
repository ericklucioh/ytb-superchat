# Ordem de prioridade do backlog

## Bloqueadores de producao
1. `todo/16-src-build-packaging-scope.md`
2. `todo/17-src-serve-path-traversal-guard.md`
3. `todo/09-ytb-go-auth-and-cors-hardening.md`
4. `todo/10-ytb-go-ws-backpressure-and-drop-visibility.md`

## Bloqueadores de fluxo
5. `todo/18-src-overlay-url-configurable.md`
6. `todo/19-src-overlay-iframe-crossorigin-guard.md`
7. `todo/20-overlay-crossorigin-parent-guard.md`
8. `todo/21-overlay-invalid-json-websocket.md`
9. `todo/01-youtube-observer-guard.md`
10. `todo/02-twitch-remove-avatar-network-from-critical-path.md`
11. `todo/03-twitch-background-sweep-hardening.md`

## Confiabilidade da ponte
12. `todo/04-bridge-delivery-ack-validation.md`
13. `todo/05-service-worker-backlog-recovery.md`
14. `todo/06-youtube-twitch-end-to-end-smoke-test.md`
15. `todo/07-production-dependency-audit.md`
16. `todo/08-telemetry-and-debug-signals.md`

## Operacao do backend
17. `todo/11-ytb-go-session-persistence-and-history.md`
18. `todo/12-ytb-go-debug-ops-and-build-env.md`

## Alias legados
19. `todo/13-youtube-bootstrap-null-guard.md`
20. `todo/14-twitch-avatar-out-of-critical-path.md`
21. `todo/15-twitch-background-sweep-review.md`

## Sequencia sugerida
1. Fechar o build e o servidor local antes de qualquer distribuicao.
2. Blindar o backend Go para nao expor evento e overlay para origem nao confiavel.
3. Corrigir o portal e o overlay para funcionar em qualquer ambiente publicado.
4. Fechar os riscos de captura de YouTube e Twitch.
5. Validar a ponte, o recovery e o smoke test real.
6. Ajustar operacao, logs e persistencia do backend.

## Observacao
Os itens `13` a `15` sao aliases legados dos itens `01` a `03`. Podem ser tratados como referencia historica, mas a implementacao deve seguir os arquivos canonicos.
