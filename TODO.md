# TODO Para Publicar o Repositorio

## Objetivo

Este plano transforma o relatorio de publicacao publica em uma sequencia de execucao pratica.

Regra de prioridade:

1. remover risco real
2. remover risco reputacional
3. melhorar apresentacao
4. melhorar manutencao

Meta final:

- abrir o repositorio sem expor segredo ou fragilidade obvia
- deixar o projeto apresentavel como portfolio
- sustentar a narrativa de produto e engenharia no LinkedIn e no GitHub

---

## Fase 0. Congelamento Antes Da Publicacao

Objetivo: evitar abrir o repo no impulso antes do saneamento minimo.

- [ ] Manter o repositorio privado ate concluir a Fase 1.
- [ ] Definir se a publicacao sera:
- [ ] portfolio pessoal com sua marca
- [ ] open source generico
- [ ] versao publica de um produto proprio
- [ ] Definir nome oficial do projeto para publicacao.
- [ ] Definir qual URL publica sera exibida no README.
- [ ] Definir qual contato publico usar: email, LinkedIn, GitHub ou site.

Entrega esperada:

- decisao de narrativa unica
- escopo de publicacao definido

---

## Fase 1. Seguranca Obrigatoria

Objetivo: remover os bloqueios reais para abrir o codigo.

## 1.1 Remover segredo do cliente

- [ ] Revisar todos os pontos onde `YTB_API_TOKEN` e aliases chegam ao browser.
- [ ] Remover `window.__YTB_API_TOKEN__`.
- [ ] Remover `apiToken` do runtime JS entregue ao portal.
- [ ] Remover `apiToken` do runtime JS entregue ao overlay.
- [ ] Revisar `src/site/streamer-app.js` para nao depender de token global no cliente.
- [ ] Revisar `src/overlay/overlay.js` para nao depender de token vindo do runtime.
- [ ] Revisar `src/scripts/runtime-env.mjs`.
- [ ] Revisar `ytb-go/internal/httpapi/runtime_env.go`.

Arquivos alvo:

- `src/site/streamer-app.js`
- `src/overlay/overlay.js`
- `src/scripts/runtime-env.mjs`
- `ytb-go/internal/httpapi/runtime_env.go`

## 1.2 Remover token na URL

- [ ] Eliminar uso de `token` na query string do overlay.
- [ ] Eliminar uso de `token` na query string do WebSocket, se existir.
- [ ] Confirmar que links compartilhados do overlay nao carregam segredo.

## 1.3 Redesenhar autenticacao publica

Escolher um caminho:

- [ ] Opcao simples: remover auth do fluxo publico e documentar que a instalacao publica e apenas para demo/local.
- [ ] Opcao intermediaria: usar token efemero por sessao emitido pelo backend.
- [ ] Opcao robusta: separar clientes publicos de operacoes sensiveis e criar auth por sessao com expiracao.

Recomendacao:

- [ ] Para abrir o repo rapido, usar a opcao simples ou a intermediaria.

## 1.4 Auditoria de segredos

- [ ] Auditar historico Git por segredos e configuracoes sensiveis.
- [ ] Auditar dominios internos, tokens, credenciais e URLs privadas.
- [ ] Se houver vazamento historico, rotacionar segredos.
- [ ] Se houver vazamento historico relevante, limpar historico antes de abrir o repo.

## 1.5 Revisar CORS e trust model

- [ ] Documentar quais origens sao confiaveis.
- [ ] Definir comportamento oficial para dev local.
- [ ] Definir comportamento oficial para deploy publico.
- [ ] Revisar defaults de `allowed origins`.

Entrega esperada:

- nenhuma credencial global no cliente
- nenhuma URL com segredo
- modelo de autenticacao coerente para repo publico

---

## Fase 2. Curadoria Do Repositorio

Objetivo: fazer o repo parecer um produto/portfolio, nao um workspace bruto.

## 2.1 Limpar raiz do repositorio

- [ ] Revisar `fix.md`.
- [ ] Revisar `plan.md`.
- [ ] Revisar `PLAN2.md`.
- [ ] Revisar `OBJETIVO.md`.
- [ ] Revisar `explicacao.md`.
- [ ] Revisar `BRAND-MANUAL.md`.
- [ ] Revisar `tasks/`.
- [ ] Revisar `todo/`.
- [ ] Revisar `.planning/`.

Para cada item, decidir:

- [ ] remover
- [ ] mover para `docs/`
- [ ] manter privado
- [ ] resumir em documentacao publica

Recomendacao:

- [ ] Deixar na raiz apenas arquivos que ajudam um estranho a entender, rodar e avaliar o projeto.

## 2.2 Remover artefatos irrelevantes para publico

- [ ] Confirmar que `out/` nao sera versionado.
- [ ] Confirmar que `extension.zip` nao sera versionado.
- [ ] Confirmar que binarios e assets gerados nao estao no controle de versao.

## 2.3 Reorganizar docs

- [ ] Criar `docs/architecture.md`.
- [ ] Criar `docs/security.md`.
- [ ] Criar `docs/use-cases.md` ou `docs/demo.md`.
- [ ] Criar `docs/extension-scope.md`.
- [ ] Mover material aproveitavel dos arquivos internos para `docs/`.

Entrega esperada:

- repo limpo
- raiz enxuta
- docs organizadas para leitura externa

---

## Fase 3. Branding E Narrativa

Objetivo: eliminar inconsistencias que enfraquecem sua imagem.

## 3.1 Definir identidade unica

- [ ] Escolher entre `YTB Superchat` e `Portal do Streamer - Eloh`.
- [ ] Padronizar nome no README.
- [ ] Padronizar nome na landing.
- [ ] Padronizar nome na extensao.
- [ ] Padronizar nome no manifest.

## 3.2 Revisar referencias pessoais

- [ ] Revisar referencias a `ytb.ericklucioh.com`.
- [ ] Revisar referencias a `chat.ericklucioh.com`.
- [ ] Revisar email pessoal na landing.
- [ ] Revisar links pessoais e decidir se entram como portfolio ou se devem ser neutralizados.

## 3.3 Posicionamento de portfolio

- [ ] Escrever uma frase curta explicando o projeto como produto.
- [ ] Escrever uma frase curta explicando o projeto como desafio tecnico.
- [ ] Escrever uma frase curta explicando o seu papel: idealizacao, implementacao, arquitetura e deploy.

Entrega esperada:

- projeto com narrativa consistente
- sem mistura confusa entre marca, repo e deploy pessoal

---

## Fase 4. README E Documentacao Publica

Objetivo: transformar o README em material de venda tecnica.

## 4.1 Reescrever README principal

- [ ] Abrir com problema + solucao em 3 a 5 linhas.
- [ ] Incluir screenshot ou GIF.
- [ ] Incluir secao `Features`.
- [ ] Incluir secao `Architecture`.
- [ ] Incluir secao `Supported flow`.
- [ ] Incluir secao `Security model`.
- [ ] Incluir secao `Development`.
- [ ] Incluir secao `Testing`.
- [ ] Incluir secao `Known limitations`.
- [ ] Incluir secao `Roadmap`.
- [ ] Incluir secao `About this project`.

## 4.2 Revisar READMEs secundarios

- [ ] Revisar `src/README.md`.
- [ ] Revisar `extension/README.md`.
- [ ] Revisar `ytb-go/README.md`.

Objetivos:

- [ ] remover ambiguidade
- [ ] alinhar terminologia
- [ ] deixar claro o que e suportado hoje

## 4.3 Documentar arquitetura

- [ ] Explicar fluxo: extensao -> portal -> backend -> overlay.
- [ ] Explicar diferenca entre sessao do bridge e sessao do overlay.
- [ ] Explicar onde o estado fica.
- [ ] Explicar o que e legado e o que e caminho principal.

Entrega esperada:

- README forte o suficiente para portfolio
- um estranho consegue entender o sistema em poucos minutos

---

## Fase 5. Escopo Publico Da Extensao

Objetivo: evitar prometer mais do que o projeto realmente sustenta.

## 5.1 Definir escopo suportado

- [ ] Marcar YouTube e Twitch como foco principal, se isso refletir a manutencao atual.
- [ ] Revisar se Kick entra como suportado de fato.
- [ ] Marcar integracoes antigas como legadas, experimentais ou nao mantidas.

## 5.2 Revisar manifest e permissoes

- [ ] Revisar `host_permissions`.
- [ ] Remover permissoes nao essenciais, se houver.
- [ ] Revisar `homepage_url`.
- [ ] Revisar nome e descricao da extensao.

## 5.3 Revisar documentacao da extensao

- [ ] Atualizar README da extensao.
- [ ] Atualizar politica de privacidade.
- [ ] Explicar o que a extensao captura, processa e envia.

Entrega esperada:

- escopo crivel
- menos risco reputacional

---

## Fase 6. Refino De Arquitetura E Clean Code

Objetivo: melhorar a qualidade percebida quando alguem abrir o codigo.

## 6.1 Dividir arquivos grandes

Prioridade alta:

- [ ] quebrar `src/site/streamer-app.js`
- [ ] quebrar `extension/sources/local-chat-bridge.js`

Sugestao de divisao para `streamer-app.js`:

- [ ] bootstrap
- [ ] sessao
- [ ] integracao com backend
- [ ] keep-awake
- [ ] copy/share overlay
- [ ] actions de UI
- [ ] render scheduling

Sugestao de divisao para `local-chat-bridge.js`:

- [ ] canal/porta
- [ ] fila pendente
- [ ] persistencia de pendencias
- [ ] reconnect/heartbeat
- [ ] diagnosticos

## 6.2 Reduzir acoplamento por globals

- [ ] Revisar uso de `window.__...`.
- [ ] Consolidar runtime config em um modulo mais explicito.
- [ ] Evitar espalhar contrato implicito de ambiente.

## 6.3 Contratos explicitos

- [ ] Centralizar esquema de eventos.
- [ ] Centralizar tipos/campos esperados por payload.
- [ ] Documentar contratos entre extensao, portal e backend.

Entrega esperada:

- codigo mais legivel
- melhor impressao tecnica
- manutencao futura mais barata

---

## Fase 7. Testes E Confiabilidade

Objetivo: sustentar a imagem de qualidade com verificacao clara.

## 7.1 Padronizar verificacao

- [ ] Documentar comandos oficiais de teste.
- [ ] Garantir que os testes rodem do zero em ambiente limpo.
- [ ] Adicionar secao de verificacao no README.

## 7.2 Coberturas recomendadas

- [ ] testar fluxo sem auth, se auth for simplificada
- [ ] testar fluxo com auth invalida, se auth permanecer
- [ ] testar reconexao de WebSocket
- [ ] testar overlay sem sessao
- [ ] testar modo degradado sem extensao

## 7.3 Smoke test do caminho principal

- [ ] Definir checklist curto do fluxo real:
- [ ] abrir portal
- [ ] conectar sessao
- [ ] receber mensagem do chat
- [ ] promover mensagem
- [ ] abrir overlay no OBS/browser source

Entrega esperada:

- historia clara de qualidade
- demonstracao reproduzivel

---

## Fase 8. Licenca, Assets E Conformidade

Objetivo: evitar problema bobo ao abrir o repo.

- [ ] Confirmar compatibilidade de redistribuicao de todos os assets.
- [ ] Revisar `jquery.js` e outros arquivos third-party commitados.
- [ ] Verificar se precisa de atribuicao adicional.
- [ ] Revisar logos e icones de plataformas.
- [ ] Revisar a politica de privacidade da extensao.
- [ ] Garantir alinhamento entre licenca do repo e conteudo distribuido.

Entrega esperada:

- repo sem duvida legal obvia

---

## Fase 9. Material De Portfolio

Objetivo: fazer o repo te vender.

## 9.1 Materiais visuais

- [ ] Capturar screenshots do dashboard.
- [ ] Capturar screenshot do overlay.
- [ ] Gravar GIF ou video curto do fluxo.
- [ ] Mostrar captura de chat e promocao para overlay.

## 9.2 Argumentos tecnicos

- [ ] Adicionar secao `Technical highlights` no README.
- [ ] Adicionar secao `Tradeoffs`.
- [ ] Adicionar secao `What I would improve next`.

## 9.3 Narrativa profissional

- [ ] Preparar resumo de 3 linhas para LinkedIn.
- [ ] Preparar resumo de 5 linhas para GitHub.
- [ ] Preparar bullets tecnicos para curriculo/portfolio.

Entrega esperada:

- projeto vendendo produto e capacidade tecnica ao mesmo tempo

---

## Fase 10. Pre-Launch

Objetivo: revisar antes de clicar em "public".

- [ ] Rodar checklist final de seguranca.
- [ ] Rodar testes do front.
- [ ] Rodar testes do backend Go.
- [ ] Revisar README renderizado no GitHub.
- [ ] Revisar links quebrados.
- [ ] Revisar imagens e GIFs.
- [ ] Revisar `.gitignore`.
- [ ] Revisar se ha arquivos desnecessarios na raiz.
- [ ] Revisar se a landing e docs nao expõem contato indevido ou infra privada.
- [ ] Revisar consistencia de nome do projeto em todo o repo.

Entrega esperada:

- candidato real a repositorio publico

---

## Ordem Recomendada De Execucao

Executar nesta ordem:

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. Fase 7
9. Fase 8
10. Fase 9
11. Fase 10

---

## Versao Curta: O Minimo Para Abrir O Repo

Se voce quiser a menor rota segura, faca pelo menos isto:

- [ ] remover segredo do cliente
- [ ] remover token da URL
- [ ] limpar arquivos internos da raiz
- [ ] alinhar branding/nome
- [ ] reescrever README
- [ ] revisar escopo da extensao
- [ ] adicionar screenshots
- [ ] rodar testes

---

## Veredito Operacional

Nao abrir agora.

Abrir depois de concluir:

- Fase 1 inteira
- Fase 2 inteira
- Fase 4 quase inteira

Se essas tres fases forem concluídas com cuidado, o repositorio ja sobe muito de nivel como portfolio publico.

