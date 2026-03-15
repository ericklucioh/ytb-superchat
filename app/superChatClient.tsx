// app/superchat/components/SuperChatClient.tsx
'use client';
// No topo do arquivo
import { 
  getSuperChatsData, 
  getMockSuperChats, 
  isRealGoogleToken,
  MOCK_SUPER_CHATS 
} from '@/app/db';
import { useState, useEffect } from 'react';
import Script from 'next/script';
import { MessageList } from './messageCard';

interface SuperChatEvent {
  id: string;
  snippet: {
    channelId: string;
    supporterDetails: {
      displayName: string;
      profileImageUrl: string;
      channelUrl: string;
    };
    commentText: string;
    displayString: string;
    amountMicros: number;
    currency: string;
    createdAt: string;
  };
}

// 🆕 NOVA INTERFACE COM is_readed
interface StoredSuperChat {
  is_readed: boolean;
  message: SuperChatEvent;
}

interface SuperChatResponse {
  items: SuperChatEvent[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function SuperChatClient() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('👈 Faça login e clique em Buscar SuperChats');
  
  // 🆕 ESTADO QUE USA A NOVA INTERFACE
  const [storedSuperChats, setStoredSuperChats] = useState<StoredSuperChat[]>([]);
  const [stats, setStats] = useState({ total: 0, amount: 0 });
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // 🆕 CARREGAR DO LOCALSTORAGE AO INICIAR
  useEffect(() => {
    const saved = localStorage.getItem('superchat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredSuperChat[];
        setStoredSuperChats(parsed);
        updateStatsFromStorage(parsed);
        setOutput(`📦 Carregadas ${parsed.length} mensagens do localStorage`);
      } catch (e) {
        console.error('Erro ao carregar localStorage', e);
      }
    }

    const savedToken = sessionStorage.getItem('youtube_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
  }, []);

  // 🆕 ATUALIZAR STATS BASEADO NO STORAGE
  const updateStatsFromStorage = (messages: StoredSuperChat[]) => {
    const totalAmount = messages.reduce((sum, item) => 
      sum + (item.message.snippet.amountMicros / 1000000), 0
    );
    
    setStats({
      total: messages.length,
      amount: totalAmount
    });
  };

  // 🆕 SALVAR NO LOCALSTORAGE SEMPRE QUE MUDAR
  useEffect(() => {
    if (storedSuperChats.length > 0) {
      localStorage.setItem('superchat_messages', JSON.stringify(storedSuperChats));
      updateStatsFromStorage(storedSuperChats);
    }
  }, [storedSuperChats]);

  const login = () => {
    if (!window.google) {
      setOutput('Erro: Biblioteca do Google não carregada');
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: "501032928481-fgrk6l73l6v4f4m27uu17igs1u0j2uop.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      callback: (response: any) => {
        if (response.error) {
          setOutput(`❌ Erro no login: ${response.error}`);
          return;
        }
        
        setAccessToken(response.access_token);
        setOutput(
          "✅ Autenticado com sucesso!\n" +
          `📌 Token: ${response.access_token.substring(0, 20)}...\n\n` +
          "Agora você pode buscar os SuperChats clicando no botão acima."
        );
        
        sessionStorage.setItem('youtube_token', response.access_token);
      }
    });

    client.requestAccessToken();
  };

  const logout = () => {
    setAccessToken(null);
    setNextPageToken(null);
    setStoredSuperChats([]);
    setStats({ total: 0, amount: 0 });
    sessionStorage.removeItem('youtube_token');
    localStorage.removeItem('superchat_messages');
    setOutput('👈 Desconectado. Dados apagados.');
  };

  // 🆕 MARCAR COMO LIDO
  const markAsRead = (messageId: string) => {
    setStoredSuperChats(prev => 
      prev.map(item => 
        item.message.id === messageId 
          ? { ...item, is_readed: true }
          : item
      )
    );
  };

  // 🆕 MARCAR TODOS COMO LIDOS
  const markAllAsRead = () => {
    setStoredSuperChats(prev => 
      prev.map(item => ({ ...item, is_readed: true }))
    );
    setOutput('✅ Todos marcados como lidos');
  };

  // 🆕 GET SUPERPCHATS - AGORA ALIMENTA O STORAGE
const getSuperChats = async (pageToken?: string) => {
  const token = accessToken || sessionStorage.getItem('youtube_token');
  
  if (!token) {
    alert("Faça login primeiro");
    return;
  }
  
  console.log('🔑 Usando token:', token.substring(0, 20) + '...');
  
  if (!accessToken) {
    setAccessToken(token);
  }

  const maxResults = (document.getElementById('maxResults') as HTMLSelectElement)?.value || '10';
  const language = (document.getElementById('language') as HTMLSelectElement)?.value || 'pt-BR';
  
  // 🆕 FUNÇÃO QUE CHAMA A API REAL
  const callRealAPI = async () => {
    let url = `https://www.googleapis.com/youtube/v3/superChatEvents?part=snippet&maxResults=${maxResults}&hl=${language}`;
    
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await fetch(url, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      throw new Error(`Erro HTTP: ${res.status}`);
    }

    return await res.json();
  };

  // 🆕 FUNÇÃO QUE CHAMA O MOCK
  const callMockAPI = async () => {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockSuperChats();
  };

  try {
    setOutput('🔄 Carregando...');
    
    // 🆕 USA A FUNÇÃO DO DB QUE DECIDE ENTRE MOCK OU API REAL
    const data = await getSuperChatsData(token, callRealAPI, callMockAPI);
    
    console.log('📦 Dados recebidos:', data);
    console.log('🔍 Token é real?', isRealGoogleToken(token));
        
if (data.items && data.items.length > 0) {
  // TRANSFORMA E ARMAZENA
  setStoredSuperChats(prev => {
    // Evita duplicatas
    const existingIds = new Set(prev.map(item => item.message.id));
    const newMessages = data.items
      .filter((msg: SuperChatEvent) => !existingIds.has(msg.id))
      .map((msg: SuperChatEvent) => ({
        is_readed: false,
        message: msg
      }));
    
    const updated = [...newMessages, ...prev];
    localStorage.setItem('superchat_messages', JSON.stringify(updated));
    
    console.log('💾 Storage atualizado:', updated);
    
    // ✅ SÓ MOSTRA SE TIVER MENSAGENS NOVAS
    if (newMessages.length > 0) {
      setOutput(`✅ ${newMessages.length} novas mensagens armazenadas!`);
    } else {
      setOutput('📭 Nenhuma mensagem nova');
    }
    
    return updated;
  });

  setNextPageToken(data.nextPageToken || null);
}else {
        setOutput('📭 Nenhum Super Chat encontrado nos últimos 30 dias');
        }

    } catch (error: any) {
        setOutput(`❌ Erro: ${error.message}`);
    }
    };

    const loadNextPage = () => {
        if (nextPageToken) {
        getSuperChats(nextPageToken);
        }
    };

    // 🆕 RENDERIZAR MENSAGENS DO STORAGE


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
            <h2 style={{ color: '#333' }}>🎬 YouTube SuperChat Storage</h2>
            
            <div style={{ marginBottom: '20px' }}>
            <button onClick={login} style={buttonStyle}>🔑 Login</button>
            <button onClick={() => getSuperChats()} style={buttonStyle} disabled={!accessToken}>
                💰 Buscar SuperChats
            </button>
            {nextPageToken && (
                <button onClick={loadNextPage} style={buttonStyle}>
                ⏩ Próxima Página
                </button>
            )}
            <button onClick={markAllAsRead} style={{...buttonStyle, backgroundColor: '#2196F3'}}>
                ✅ Marcar todos como lidos
            </button>
            <button onClick={logout} style={{...buttonStyle, backgroundColor: '#f44336'}}>
                🚪 Logout
            </button>
            </div>

            <div style={{ marginBottom: '15px' }}>

            
            <select id="language" style={selectStyle}>
                <option value="pt-BR">Português</option>
                <option value="en">Inglês</option>
                <option value="es">Espanhol</option>
            </select>
            </div>

            {stats.total > 0 && (
            <div style={{
                margin: '10px 0',
                padding: '10px',
                background: '#e3f2fd',
                borderRadius: '4px'
            }}>
                <strong>📊 Estatísticas Storage:</strong> 
                <span style={{ marginLeft: '10px' }}>
                Total: {stats.total} eventos | 
                Arrecadado: ${stats.amount.toFixed(2)} |
                Não lidas: {storedSuperChats.filter(s => !s.is_readed).length}
                </span>
            </div>
            )}
<div style={{ marginTop: '20px' }}>
  <MessageList />
</div>
        </div>
        </>
    );
    }

    const buttonStyle = {
    margin: '5px',
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
    margin: '5px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px'
    };