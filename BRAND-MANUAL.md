# Manual de Marca - Erick Lucio

Documento de identidade visual e tom de marca extraído do sistema real deste projeto.
Este manual serve como base para novos projetos que precisem manter a mesma assinatura:
tecnológica, limpa, técnica e levemente editorial.

## 1. Essência da marca

A marca combina:

- Engenharia e precisão
- Estética técnica, com vocação para produto e portfólio profissional
- Estrutura documental, quase como uma interface entre site e terminal
- Presença discreta, sem excesso de enfeite
- Contraste alto, legibilidade e composição objetiva

Palavras que resumem a identidade:

- técnico
- confiável
- direto
- sofisticado sem ser ornamental
- funcional antes de decorativo

O sistema visual não busca parecer "moderno" no sentido genérico. Ele busca parecer
intencional, controlado e de autoria.

## 2. Direção visual

### Princípios

1. Fundo escuro ou claro, mas sempre com sensação de superfície controlada.
2. Azul profundo como base de marca.
3. Ciano/azul elétrico como destaque funcional.
4. Tipografia monoespaçada como assinatura de ambiente técnico.
5. Bordas finas, cartões discretos e transparência suave.
6. Decoração geométrica minimalista como ruído controlado.

### O que o visual comunica

- Estrutura e organização
- Capacidade técnica
- Clareza de pensamento
- Baixo drama visual
- Confiança e maturidade profissional

## 3. Paleta de cores

A paleta é construída em camadas:

- cores-base
- cores semânticas
- cores de ação
- cores de destaque

### 3.1 Cores-base

Fonte: [`src/app/styles/colors.tokens.css`](/home/erick/code/ericklucioh/ericklucioh.com/src/app/styles/colors.tokens.css)

| Token | Valor | Uso |
|---|---:|---|
| `--color-primary-1` | `#004f78` | Azul principal forte, mais útil em ações e estados escuros |
| `--color-primary-2` | `#0e4461` | Azul principal mais frequente no sistema claro |
| `--color-primary-3` | `indefinido` | Token presente no arquivo, mas atualmente sem valor válido no código |
| `--color-light-1` | `#ffffff` | Branco puro |
| `--color-light-2` | `#f5fbff` | Fundo claro principal |
| `--color-light-3` | `#e9f4ff` | Superfície clara levemente azulada |
| `--color-soft-1` | `#b7e6ff` | Azul suave de pressão/realce |
| `--color-soft-2` | `#8cc1de` | Azul suave intermediário |
| `--color-soft-3` | `#4fc3ff` | Azul-ciano mais vibrante |
| `--color-gray-1` | `#667288` | Cinza frio para texto e suporte |
| `--color-gray-2` | `#282c33` | Cinza escuro de borda/texto secundário |
| `--color-gray-3` | `#191b1e` | Cinza muito escuro para base escura |
| `--color-dark-1` | `#000d21` | Fundo escuro mais "profundo" |
| `--color-dark-2` | `#020a16` | Fundo escuro principal |
| `--color-dark-3` | `#090d14` | Superfície escura de cartão |
| `--color-black` | `#000000` | Preto absoluto |
| `--color-white` | `#ffffff` | Branco absoluto |
| `--color-aux-blue` | `#0091c3` | Azul auxiliar de destaque e links |

### 3.2 Cores semânticas

Fonte: [`src/app/styles/colors.semantic.css`](/home/erick/code/ericklucioh/ericklucioh.com/src/app/styles/colors.semantic.css)

#### Light mode

- `--text-primary` aponta para o azul principal definido pelo sistema.
- `--text-secondary` e `--text-accent` usam `--color-aux-blue`.
- `--bg-page` usa `--color-light-2`.
- `--bg-surface` usa `--color-light-1`.
- `--bg-card` usa `--color-light-3`.
- `--border-default` usa `--color-gray-2`.
- `--border-soft` usa `--color-gray-1`.
- `--decor` usa `--color-primary-2`.
- `--action-primary` e `--action-hover` usam `--color-primary-2`.
- `--action-pressed` usa `--color-soft-1`.
- `--highlight-soft` usa `--color-soft-2`.
- `--highlight-strong` usa `--color-soft-3`.

#### Dark mode

- `--text-primary` vira branco.
- `--text-secondary` e `--text-accent` continuam em azul auxiliar.
- `--bg-page` usa `--color-dark-2`.
- `--bg-surface` usa `--color-dark-1`.
- `--bg-card` usa `--color-dark-3`.
- `--border-default` e `--border-soft` mantêm os cinzas de contraste.
- `--decor` vira branco, para destacar a decoração sobre o fundo escuro.
- `--action-primary` usa `--color-primary-1`.
- `--action-hover` usa `--color-primary-2`.
- `--action-pressed` usa `--color-primary-3`.

### 3.3 Regras de uso

- Azul profundo é a assinatura da marca.
- Ciano/azul brilhante é acento, não cor de preenchimento dominante.
- Fundos nunca são chapados "puros" quando houver superfície; eles devem parecer camadas.
- Borda e texto secundário precisam funcionar como estrutura, não como ornamento.
- O sistema aceita luz e escuro, mas o comportamento visual deve continuar técnico e contido.

### 3.4 Atenção técnica

O token `--color-primary-3` aparece como referência em `colors.tokens.css`, mas o valor
está indefinido no arquivo atual. Em novos projetos, esse ponto deve ser corrigido antes
de replicar a paleta.

## 4. Tipografia

### Fonte-base

- A interface usa `Fira Code` como fonte principal do body.
- Isso define a personalidade geral do site: técnica, codificada, precisa.

Fonte: [`src/app/layout.tsx`](/home/erick/code/ericklucioh/ericklucioh.com/src/app/layout.tsx)

### Hierarquia

- Títulos grandes usam peso alto, espaçamento compacto e leitura direta.
- Subtítulos são mais leves, com largura máxima controlada.
- Textos curtos são preferidos a parágrafos longos.
- Headings e labels têm forte relação com documentação e terminal.

### Padrões observados

- Títulos principais: grandes, fortes, com `letter-spacing` negativo leve.
- Seções: menores, com uma linha de apoio visual no final.
- Labels/tags: caixa baixa ou caixa alta discreta, muito curtas.
- Código e trechos técnicos: mesma família monoespaçada do corpo.

### Regra de leitura

Quando a hierarquia ficar ambígua, prefira:

1. Peso
2. Espaço
3. Contraste
4. Tamanho

Não use variações excessivas de fonte para resolver hierarquia. A identidade depende da
coerência, não da diversidade tipográfica.

## 5. Grid, espaçamento e composição

### Estrutura geral

- O layout trabalha com gutters amplos.
- O conteúdo principal costuma ser centralizado e limitado em largura.
- Há uso consistente de grids de 12 colunas em páginas editoriais.
- O ritmo vertical é espaçado, mas não disperso.

### Regras espaciais

- Use cartões com padding de 1rem a 1.5rem como faixa padrão.
- Seções precisam de separação clara entre blocos.
- O conteúdo deve respirar, mas sem se tornar vazio.
- Em mobile, o sistema reduz gutters e simplifica o fluxo.

### Forma de composição

- Hero + cartões + tags é um padrão recorrente.
- Navegação e rodapé ficam fixos ou semimanentes em torno do conteúdo.
- Decoração fica atrás da camada funcional, nunca competindo com ela.

## 6. Superfícies, bordas e contraste

### Superfícies

As superfícies são construídas com:

- fundo com mistura da base do tema
- transparência parcial
- blur suave
- borda fina de contraste

Isso aparece em:

- header
- footer
- cards
- painéis de menu
- blocos de markdown

### Bordas

- Bordas são finas.
- Bordas usam cinza ou azul em baixa opacidade.
- As bordas existem para separar, não para desenhar caixas pesadas.

### Contraste

- O contraste é sempre funcional.
- O texto principal precisa continuar legível mesmo com decoração ao fundo.
- O texto secundário define atmosfera, mas não pode competir com o conteúdo.

### Estilo de bloco

Padrão visual recorrente:

- fundo levemente translúcido
- borda de 1px
- uma linha de destaque no topo do cartão
- conteúdo interno organizado em blocos curtos

## 7. Padrões de componente

### 7.1 Header

Características:

- fixo no topo
- fundo translúcido
- blur de vidro discreto
- links em formato de ação

Use esse padrão quando o projeto exigir navegação persistente sem agressividade visual.

### 7.2 Footer

Características:

- barra final com links utilitários
- separação superior visível
- tipografia pequena
- aparência de bloco funcional

### 7.3 Cards

Características:

- contorno fino
- fundo semitransparente
- topo com linha de destaque
- conteúdo interno em seções curtas

O cartão é o bloco base do sistema. Ele deve servir para:

- experiência
- stack
- posts
- links
- chamadas de ação

### 7.4 Pills / tags

Características:

- compactas
- borda discreta
- fundo suave
- usadas para metadados e filtros

Elas funcionam como vocabulário visual de contexto, não como botões principais.

### 7.5 Links e ações

- Links não precisam parecer botões pesados.
- A ação pode ser compacta, quase inline.
- O hover deve reforçar a presença, não mudar a identidade.

### 7.6 Botões de links rápidos

O linktree usa botões largos, block-level, com borda azul e hover mais intenso.
Esse padrão é adequado quando o objetivo é conversão simples e navegação rápida.

### 7.7 404 e páginas especiais

As páginas especiais usam a mesma linguagem visual:

- grid geométrico
- tipografia forte
- destaque para o número/código
- CTA claro e direto

## 8. Decoração e linguagem geométrica

### Elementos recorrentes

- grade de pontos
- retângulos vazados
- blocos geométricos com contorno fino
- animação sutil de flutuação

### Função da decoração

A decoração não é ilustrativa. Ela tem função de:

- criar profundidade
- sugerir complexidade técnica
- dar assinatura visual
- preencher áreas amplas sem poluição

### Regras

- A decoração fica por trás da interface.
- Nunca deve prejudicar leitura.
- Deve parecer sistemática, não aleatória.
- Formas geométricas repetidas são preferíveis a arte ornamental complexa.

### Comportamento

- Há uso de animação contínua e sutil.
- O movimento é leve, quase instrumental.
- Em telas pequenas, parte da decoração é reduzida ou ocultada.

## 9. Motion

O movimento do sistema é mínimo, com três usos principais:

1. Transições de tema.
2. Micro animações em decoração.
3. Feedback de hover/focus.

### Diretrizes

- Prefira transições curtas.
- Animação deve reforçar estrutura, não chamar mais atenção que o conteúdo.
- Se houver `prefers-reduced-motion`, a interface precisa continuar correta sem animação.

### O que evitar

- bounce exagerado
- easing cartunesco
- parallax agressivo
- microinterações excessivas

## 10. Voz da marca

### Tom

- Direto
- Técnico
- Claro
- Profissional
- Sem enfeite desnecessário

### Vocabulário

Use palavras que indiquem engenharia e domínio:

- sistema
- arquitetura
- dados
- integração
- fluxo
- API
- automação
- observabilidade
- produção

### Forma de escrever

- Frases curtas ou médias.
- Um conceito por parágrafo.
- Evite excesso de metáforas.
- Prefira clareza operacional a marketing abstrato.

### Microcopy

Boa microcopy para essa marca:

- orientada à ação
- honesta sobre estado e contexto
- curta, mas não seca
- com leveza técnica

Exemplos:

- `Ver projeto`
- `Ler post`
- `Abrir LinkedIn`
- `Go home`
- `Under construction`
- `Notas sobre backend, IA e entrega de software`

### Evitar

- linguagem exageradamente promocional
- clichês de startup
- frases genéricas como "soluções inovadoras"
- excesso de adjetivos vazios

## 11. Regras de aplicação em outros projetos

### O que carregar primeiro

1. Token de cor.
2. Sistema de superfície e borda.
3. Tipografia monoespaçada ou técnica.
4. Cards e pills.
5. Decoração geométrica mínima.
6. Tom de texto direto.

### O que adaptar

- Conteúdo editorial pode trocar a malha de cartões pelo grid mais apropriado.
- O logo pode mudar, mas a lógica de contraste e superfície deve permanecer.
- A decoração pode mudar de forma, mas não de função.
- O idioma pode mudar, mas o tom deve continuar preciso.

### O que não mudar sem motivo forte

- uso de azul como assinatura
- cards translúcidos com borda fina
- sensação documental/técnica
- hierarquia limpa
- densidade visual contida

### Checklist de fidelidade

Se um projeto disser que segue essa marca, ele deve manter:

- fundo com profundidade
- azul profundo + ciano
- tipografia técnica
- espaçamento respirado
- bordas finas
- comportamento objetivo
- decoração geométrica sutil

## 12. Do / Don’t

### Do

- Use cartões discretos para organizar conteúdo.
- Prefira superfícies semiopacas.
- Deixe o texto falar primeiro.
- Use tags para contexto, não para enfeite.
- Mantenha animações pequenas e funcionais.
- Reduza complexidade em mobile.

### Don't

- Não use paletas saturadas e multicoloridas.
- Não adote sombras pesadas ou brilho excessivo.
- Não troque a fonte técnica por uma fonte genérica sem necessidade.
- Não centralize todo layout por padrão se isso quebrar a leitura.
- Não use decoração como conteúdo principal.
- Não misture muitos estilos visuais no mesmo projeto.

## 13. Exemplo de traducao do sistema

### Para um novo site pessoal

- Fundo escuro com superfície clara apenas em blocos.
- Hero com título forte, subtítulo curto e tags de contexto.
- Cards para projetos, experiência ou posts.
- Footer minimalista com links úteis.

### Para um produto SaaS

- Mesma paleta base.
- Cards substituem blocos de features, métricas e estados.
- Blur e transparência ficam mais contidos.
- A decoração geométrica deve ser ainda mais discreta.

### Para um blog técnico

- Mantém a tipografia monoespaçada.
- Usa `ui-card` como bloco editorial.
- Navegação com pills e filtros.
- Citações e código seguem o sistema de markdown.

## 14. Resumo rápido

Se precisar recriar a marca em outro projeto, lembre-se:

- Azul profundo é a assinatura.
- Ciano é acento.
- Monoespaçada é personalidade.
- Card com borda fina é o bloco base.
- Blur e transparência dão profundidade.
- Decoração geométrica dá assinatura sem poluir.
- O tom de voz é técnico, direto e confiável.

Este manual descreve um sistema visual de engenharia, não uma estética genérica.
