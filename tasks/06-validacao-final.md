# Tarefa 06 - Validacao Final

## Objetivo
Validar o fluxo ponta a ponta antes de considerar a aplicação pronta.

## O que falta
- Rodar build e testes do backend de forma repetível.
- Fazer smoke test do portal, overlay e OBS.
- Confirmar que o clique numa mensagem gera o overlay correto.
- Confirmar que a limpeza do overlay funciona com `contents: false`.

## Entregas
- Checklist final de funcionamento.
- Evidência de que o build e o Go server estão íntegros.
- Verificação manual do fluxo real da live.

## Pronto quando
- `npm run build` passa.
- `go test ./...` passa.
- O overlay funciona em `/overlay?session=...`.
- O fluxo completo de captura -> portal -> OBS está operando.
