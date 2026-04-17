# Tarefa 06 - Validacao Final

## Contexto
O backlog só fecha quando o produto estiver validado em um cenário real.

## Objetivo
Validar o fluxo ponta a ponta antes de considerar a aplicação pronta.

## O Que Existe Hoje
- Build e testes do Go já passam no estado atual.
- O overlay já responde pelo caminho novo.
- A documentação já aponta para o backend como fonte de verdade.

## O que falta
- Rodar build e testes do backend de forma repetível.
- Fazer smoke test do portal, overlay e OBS.
- Confirmar que o clique numa mensagem gera o overlay correto.
- Confirmar que a limpeza do overlay funciona com `contents: false`.

## Riscos
- Validar só build e esquecer o cenário real de OBS.
- Validar uma sessão e não validar isolamento entre sessões.
- Considerar pronto sem checar limpeza e reconexão.

## Entregas
- Checklist final de funcionamento.
- Evidência de que o build e o Go server estão íntegros.
- Verificação manual do fluxo real da live.

## Pronto quando
- `npm run build` passa.
- `go test ./...` passa.
- O overlay funciona em `/overlay?session=...`.
- O fluxo completo de captura -> portal -> OBS está operando.

## Testes E Validação
- Build completo.
- Testes Go completos.
- Smoke test do overlay.
- Smoke test de sessão paralela.
- Smoke test de limpeza do overlay.

## Assunções
- A aceitação final depende de cenário real do OBS.
- O visual final segue o baseline atual.
