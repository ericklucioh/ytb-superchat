**Plano de Correção: Memória do Portal em Lives Longas**

**Resumo**
- O problema principal não é o chat normal, porque ele já fica limitado a 500.
- O crescimento de memória vem do histórico completo de `superchat` e `assinaturas`, que hoje fica todo em memória e também participa do render.
- A correção deve preservar o histórico completo desses eventos, mas tirar o peso deles da área “quente” da UI.

**Mudanças de Implementação**
- Separar estado quente de histórico frio no portal.
- Em `src/site/streamer-store.js`, manter em memória só o que a UI precisa consultar com frequência, e mover o histórico completo de `superchat`/`member`/`sub` para uma estrutura de arquivo/armazenamento paginado.
- Em `src/site/streamer-view.js`, parar de renderizar a lista completa de eventos especiais a cada atualização; renderizar apenas uma janela recente e carregar páginas antigas sob demanda.
- Em `src/site/streamer-app.js`, evitar recriar e decorar listas grandes quando nada material mudou, e memoizar a decoração de `superchat` por `id`/`currencyRate`.
- Manter o limite atual de 500 para `chat` normal sem alterar o comportamento dele.
- Preservar filtros, detalhe e totalizadores, mas fazer a consulta ao histórico completo por acesso sob demanda em vez de manter tudo como DOM e arrays vivos o tempo todo.

**Plano de Teste**
- Rodar uma sessão simulada longa com volume alto de `superchat` e `assinaturas` e confirmar que o heap estabiliza em vez de subir sem parar.
- Verificar que `chat` normal continua limitado a 500.
- Confirmar que `superchat` e `assinaturas` continuam acessíveis no histórico completo após reload.
- Validar que filtros, totais e popup de detalhe continuam funcionando com o histórico paginado.
- Repetir o teste com o portal aberto por várias horas e comparar antes/depois usando o heap do navegador.

**Assunções**
- O histórico completo só precisa ser preservado para `superchat` e `assinaturas`.
- O objetivo não é mudar o comportamento visual principal, e sim reduzir retenção e pressão de GC.
- A solução pode exigir uma camada de armazenamento mais apropriada que `localStorage` para o arquivo frio do histórico, desde que a UI continue simples para o operador.
