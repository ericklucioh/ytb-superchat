# Pergunta Composta e Clarificação Humana

## Resumo
- A frase do log não é só uma consulta de custo: ela mistura uma consulta principal com uma segunda intenção de variação entre extremos.
- O sistema hoje confundiu isso com `comparison_pair`, mas o problema real não é falta de par comparativo.
- O primeiro trecho já está quase resolvido: empresa 44, unidade 1 e março foram entendidos. O que falta é modelar a segunda intenção de forma humana e não pedir `slot pendente`.

## Mudanças
- `question_preprocessing`
  - Detectar perguntas compostas com conectores como `e faça`, `além de`, `e também`, `e`.
  - Separar a intenção principal da intenção secundária.
  - Tratar `maior e menor custo` como pedido de extremos/ranking sobre o conjunto filtrado, não como `comparison_pair`.
  - Manter o default de ano corrente quando houver mês ou trimestre; não pedir período nesse caso.
- `semantic_core` e `planner`
  - Para a intenção secundária, gerar um resumo semântico explícito do que foi entendido: custo filtrado + variação entre extremos.
  - Quando ainda faltar algo, a clarificação deve ser em linguagem natural, por exemplo: `Você quer a variação entre quais bitolas?`, e nunca `slot pendente: comparison_pair`.
- `clarification_contract`
  - Adicionar um texto de contexto que exponha `primary_intent`, `secondary_intent` e `period_context`.
  - Se a intenção secundária estiver incompleta, o contrato deve refletir isso em texto humano, não em nome de campo interno.
- `pipeline.log`
  - Melhorar os eventos para mostrar o que foi entendido de cada parte da pergunta, para facilitar debug futuro.

## Testes
- Cobrir esta frase exata do log como caso composto.
- Cobrir frase com mês mas sem ano, confirmando que não pede período.
- Cobrir frase com variação/extremos sem `comparison_pair`, confirmando que a clarificação vira texto humano.
- Cobrir caso em que a pergunta não é composta, para não regredir o fluxo atual.

## Assumptions
- `produtizas` deve ser entendido como `produzidas`.
- A segunda intenção de `maior e menor custo` significa extremos dentro do conjunto filtrado, não comparação entre duas categorias explícitas.
- O ano corrente continua sendo default quando existe pelo menos um sinal temporal como mês ou trimestre.
