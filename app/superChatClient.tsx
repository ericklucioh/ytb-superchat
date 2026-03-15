// app/superchat/components/SuperChatClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { 
  getSuperChatsData, 
  getMockSuperChats, 
  isRealGoogleToken 
} from '@/app/db';
import { MessageList } from './messageList';
import { SuperChatEvent, StoredSuperChat, SuperChatResponse } from './types';

declare global {
  interface Window {
    google?: any;
  }
}

export default function SuperChatClient() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [storedSuperChats, setStoredSuperChats] = useState<StoredSuperChat[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Carregar do localStorage ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('superchat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredSuperChat[];
        setStoredSuperChats(parsed);
      } catch (e) {
        console.error('Erro ao carregar localStorage', e);
      }
    }

    const savedToken = sessionStorage.getItem('youtube_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
  }, []);

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    if (storedSuperChats.length > 0) {
      localStorage.setItem('superchat_messages', JSON.stringify(storedSuperChats));
    }
  }, [storedSuperChats]);
const removeMessage = (messageId: string) => {
  setStoredSuperChats(prev => {
    const updated = prev.filter(item => item.message.id !== messageId);
    localStorage.setItem('superchat_messages', JSON.stringify(updated));
    return updated;
  });
};

// E passe para o MessageList:

  const login = () => {
    if (!window.google) {
      alert('Erro: Biblioteca do Google não carregada');
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: "501032928481-fgrk6l73l6v4f4m27uu17igs1u0j2uop.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      callback: (response: any) => {
        if (response.error) {
          alert(`Erro no login: ${response.error}`);
          return;
        }
        
        setAccessToken(response.access_token);
        sessionStorage.setItem('youtube_token', response.access_token);
      }
    });

    client.requestAccessToken();
  };

  const logout = () => {
    setAccessToken(null);
    setNextPageToken(null);
    setStoredSuperChats([]);
    sessionStorage.removeItem('youtube_token');
    localStorage.removeItem('superchat_messages');
  };


  const markAllAsRead = () => {
    setStoredSuperChats(prev => 
      prev.map(item => ({ ...item, is_readed: true }))
    );
  };

  const getSuperChats = async (pageToken?: string) => {
    const token = accessToken || sessionStorage.getItem('youtube_token');
    
    if (!token) {
      alert("Faça login primeiro");
      return;
    }
    
    if (!accessToken) {
      setAccessToken(token);
    }

    const maxResults = (document.getElementById('maxResults') as HTMLSelectElement)?.value || '10';
    const language = (document.getElementById('language') as HTMLSelectElement)?.value || 'pt-BR';
    
    const callRealAPI = async () => {
      let url = `https://www.googleapis.com/youtube/v3/superChatEvents?part=snippet&maxResults=${maxResults}&hl=${language}`;
      
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const res = await fetch(url, {
        headers: { "Authorization": "Bearer " + token }
      });

      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
      return await res.json();
    };

    const callMockAPI = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return getMockSuperChats();
    };

    try {
      const data = await getSuperChatsData(token, callRealAPI, callMockAPI);
      
      if (data.items && data.items.length > 0) {
        setStoredSuperChats(prev => {
          const existingIds = new Set(prev.map(item => item.message.id));
          const newMessages = data.items
            .filter((msg: SuperChatEvent) => !existingIds.has(msg.id))
            .map((msg: SuperChatEvent) => ({
              is_readed: false,
              message: msg
            }));
          
          const updated = [...newMessages, ...prev];
          localStorage.setItem('superchat_messages', JSON.stringify(updated));
          
          if (newMessages.length > 0) {
            alert(`✅ ${newMessages.length} novas mensagens armazenadas!`);
          }
          
          return updated;
        });

        setNextPageToken(data.nextPageToken || null);
      }

    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const loadNextPage = () => {
    if (nextPageToken) {
      getSuperChats(nextPageToken);
    }
  };

  const markAsRead = (messageId: string) => {
    setStoredSuperChats(prev => 
      prev.map(item => 
        item.message.id === messageId 
          ? { ...item, is_readed: true }
          : item
      )
    );
  };
  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
      />
      
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h2 style={{ color: '#333' }}>🎬 YouTube SuperChat</h2>
        
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={login} style={buttonStyle}>
            🔑 Login
          </button>
          
          <button 
            onClick={() => getSuperChats()} 
            style={buttonStyle}
            disabled={!accessToken}
          >
            💰 Buscar
          </button>
          
          {nextPageToken && (
            <button onClick={loadNextPage} style={buttonStyle}>
              ⏩ Próxima Página
            </button>
          )}
          
          <button onClick={logout} style={{...buttonStyle, backgroundColor: '#f44336'}}>
            🚪 Sair
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <select id="maxResults" style={selectStyle}>
            <option value="5">5 resultados</option>
            <option value="10" selected>10 resultados</option>
            <option value="25">25 resultados</option>
            <option value="50">50 resultados</option>
          </select>
          
          <select id="language" style={selectStyle}>
            <option value="pt-BR">Português</option>
            <option value="en">Inglês</option>
            <option value="es">Espanhol</option>
          </select>
        </div>

<MessageList 
  messages={storedSuperChats}
  onMarkAsRead={markAsRead}
  onMarkAllAsRead={markAllAsRead}
  onRemoveMessage={removeMessage} // Nova prop
/>
      </div>
    </>
  );
}

const buttonStyle = {
  margin: '0',
  padding: '10px 15px',
  cursor: 'pointer',
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px'
};

const selectStyle = {
  padding: '8px',
  marginRight: '8px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  fontSize: '14px'
};