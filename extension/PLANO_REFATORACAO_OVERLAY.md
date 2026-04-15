# Plano de Refatoração: Overlay no Portal

## Objetivo
Migrar a responsabilidade do overlay do OBS da extensão para o portal, tornando a extensão responsável apenas pela captura e armazenamento dos chats.

## Justificativa
- Centraliza a lógica e visual do overlay no portal, facilitando manutenção e evolução.
- Simplifica a extensão, reduzindo permissões e código.
- Permite atualizações e customizações do overlay sem depender de atualizações da extensão.

## Etapas do Plano

1. **Extensão**
   - Remover arquivos e lógica relacionados ao overlay (index.html, main.css, etc.).
   - Garantir que a extensão apenas captura e armazena chats no storage.
   - Revisar e simplificar o manifest.json e scripts.

2. **Portal**
   - Implementar o overlay como parte do portal (visualização, customização, integração com OBS).
   - Ler dados do storage da extensão (via API ou integração direta, conforme arquitetura).
   - Gerenciar visual, temas e lógica do overlay centralmente.

3. **Integração**
   - Definir e documentar o formato de dados compartilhado entre extensão e portal.
   - Garantir que o portal consiga acessar os dados em tempo real ou quase real.

4. **Testes e Validação**
   - Testar fluxo completo: captura na extensão → leitura no portal → overlay no OBS.
   - Validar performance, segurança e UX.

5. **Documentação**
   - Atualizar documentação de ambos os projetos para refletir a nova arquitetura.

---
Este plano pode ser ajustado conforme necessidades técnicas ou feedback dos usuários.