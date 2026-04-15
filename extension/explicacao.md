# 🎥 Portal do Streamer - Eloh

Uma extensão Chrome e interface web para centralização de chats de transmissões ao vivo em tempo real, com foco em integração com overlays (OBS e similares).

---

## 🚀 Visão Geral

O **Portal do Streamer - Eloh** é uma solução que permite capturar mensagens de chats ao vivo de diferentes plataformas de streaming e centralizá-las em uma única interface.

A extensão atua diretamente nas páginas de chat (popout) das plataformas suportadas, coletando as mensagens e disponibilizando esses dados localmente para um painel web.

---

## 🧩 Como Funciona

1. O usuário abre o chat popout de plataformas como:
   - YouTube
   - Twitch
   - Kick

2. A extensão:
   - lê as mensagens do chat em tempo real
   - processa os dados localmente
   - armazena temporariamente no `storage` do navegador

3. O painel web (site centralizador):
   - acessa esses dados localmente
   - exibe todos os chats em uma interface unificada

4. O streamer pode:
   - visualizar múltiplos chats ao mesmo tempo
   - selecionar mensagens específicas
   - gerar overlays para uso no OBS

---

## 🎯 Objetivo

Eliminar a necessidade de APIs externas ou serviços intermediários, mantendo todo o processamento:
- local
- leve
- em tempo real

---

## 🔒 Privacidade

- Nenhum dado é enviado para servidores externos
- Todas as informações são processadas localmente no navegador
- Nenhuma informação pessoal do usuário é coletada
- Apenas mensagens públicas de chat são acessadas

---

## ⚙️ Tecnologias Utilizadas

- Chrome Extension (Manifest V3)
- JavaScript
- Local Storage (Chrome Storage API)
- Interface Web (dashboard)

---

## 📦 Estrutura

- `content_scripts` → captura dos chats nas plataformas
- `service_worker` → controle da extensão
- `storage` → comunicação entre extensão e interface web
- `dashboard` → exibição e controle dos chats

---

## 🧪 Uso

1. Instale a extensão
2. Abra chats popout das plataformas suportadas
3. Acesse o painel web
4. Visualize e gerencie os chats em tempo real
5. Utilize mensagens para overlays no OBS

---

## ⚠️ Limitações

- Funciona apenas em páginas de chat suportadas
- Depende da estrutura do DOM das plataformas (pode quebrar com mudanças)
- Não utiliza APIs oficiais das plataformas

---

## 📬 Contato

Para suporte ou feedback:

📧 ericklucioh@gmail.com

---

## 📝 Licença

Este projeto é distribuído para uso pessoal e educacional.  
Para uso comercial ou redistribuição, entre em contato com o autor.