# Refatoração do `DWListaTot` em bridge técnico + lookup de apresentação

## Summary
Separar explicitamente as duas funções do `DWListaTot`:

- **Bridge técnico**: usar `CodBitGrupo` para chegar aos `CodItem` e filtrar os fatos cedo.
- **Lookup de apresentação**: usar `DWListaTot` só no final para nomes/descrições quando a resposta realmente precisar disso.

Como `CodItem` é único no teu domínio, o bridge pode ser simplificado para `GROUP BY CodItem`, sem `CodEmpresa` e `CodUnidade`.

## Key Changes
- Em [`src/sql_builder/compiler/enrichments/dwlistatot.py`](/home/erick/code/mhk/backend/src/sql_builder/compiler/enrichments/dwlistatot.py), criar um helper novo para bridge, separado dos helpers de lookup:
  - montar uma CTE/subquery com `SELECT CodItem FROM DWListaTot WHERE ... GROUP BY CodItem`
  - aplicar nela os filtros técnicos de `DWListaTot` como `CodBitGrupo = 94`
  - não trazer colunas descritivas nessa etapa
- Em [`src/sql_builder/engine.py`](/home/erick/code/mhk/backend/src/sql_builder/engine.py), alterar o caminho `fact_fact` para:
  - construir o bridge de `DWListaTot` antes do join entre fatos
  - filtrar `DWCustoPadReal` e `DWProdReal` por esse bridge antes de agregar
  - manter os joins de lookup existentes só para colunas descritivas no resultado final
- Remover a dependência de `MAX(DWListaTot.CodBitGrupo)` como mecanismo principal para resolver o filtro do grupo quando a pergunta for de filtro técnico, não de apresentação.
- Preservar os helpers atuais de lookup para `Produto`, `Bitola`, `Grupo_Bitola`, `Unidade_Pai` e `DWCadastros_OEE`, mas impedir que eles sejam usados como caminho principal de restrição de cardinalidade.
- Para essa pergunta específica, o SQL final deve sair com o universo reduzido antes do `JOIN` de fatos, não depois.

## Test Plan
- Adicionar/ajustar teste unitário no builder para verificar que:
  - perguntas com `CodBitGrupo` geram bridge em `DWListaTot` antes do join de fatos
  - o SQL final não depende de um join tardio em `DWListaTot` para filtrar o grupo
  - `CodItem` é a chave do bridge, sem `CodEmpresa`/`CodUnidade`
- Manter ou ajustar snapshot de SQL para a pergunta:
  - `Qual o custo ponderado real do grupo de bitola 94 em 2025?`
- Validar que os lookup joins continuam funcionando para respostas que pedem descrição textual.
- Rodar `EXPLAIN`/`EXPLAIN ANALYZE` comparando o plano antes e depois, focando em:
  - redução de linhas intermediárias
  - redução de custo no join fato-fato
  - eliminação do nested loop tardio com `DWListaTot` como filtro final

## Assumptions
- `CodItem` é globalmente único no domínio, inclusive entre unidades e empresas.
- `DWListaTot` continua sendo a fonte de verdade para mapear `CodBitGrupo -> CodItem`.
- O comportamento atual de resposta está correto; a refatoração é só de performance e de modelagem do plano SQL.
- O resultado final da pergunta pode continuar exibindo `CodBitGrupo`, mas ele não precisa ser obtido por um join tardio de enriquecimento.
