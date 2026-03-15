
// app/superchat/components/db.ts

// Mock data no mesmo formato da API do YouTube
export const MOCK_SUPER_CHATS = [
  {
    id: "MOCK_1",
    snippet: {
      channelId: "UC_mock_channel_1",
      supporterDetails: {
        displayName: "João Silva",
        profileImageUrl: "https://ui-avatars.com/api/?name=João+Silva&background=random",
        channelUrl: "https://youtube.com/@joaosilva"
      },
      commentText: "Melhor live de todaselhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!elhor live de todas!! 🚀",
      displayString: "R$ 50,00",
      amountMicros: 50000000,
      currency: "BRL",
      createdAt: new Date().toISOString()
    }
  },
  {
    id: "MOCK_2",
    snippet: {
      channelId: "UC_mock_channel_2",
      supporterDetails: {
        displayName: "Maria Oliveira",
        profileImageUrl: "https://ui-avatars.com/api/?name=Maria+Oliveira&background=random",
        channelUrl: "https://youtube.com/@mariaoliveira"
      },
      commentText: "Conteúdo incrível! 👏",
      displayString: "R$ 25,00",
      amountMicros: 25000000,
      currency: "BRL",
      createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hora atrás
    }
  },
  {
    id: "MOCK_3",
    snippet: {
      channelId: "UC_mock_channel_3",
      supporterDetails: {
        displayName: "Pedro Santos",
        profileImageUrl: "https://ui-avatars.com/api/?name=Pedro+Santos&background=random",
        channelUrl: "https://youtube.com/@pedrosantos"
      },
      commentText: "Super Chat pra dar aquela força! 💪",
      displayString: "R$ 100,00",
      amountMicros: 100000000,
      currency: "BRL",
      createdAt: new Date(Date.now() - 7200000).toISOString() // 2 horas atrás
    }
  },
  {
    id: "MOCK_4",
    snippet: {
      channelId: "UC_mock_channel_4",
      supporterDetails: {
        displayName: "Ana Costa",
        profileImageUrl: "https://ui-avatars.com/api/?name=Ana+Costa&background=random",
        channelUrl: "https://youtube.com/@anacosta"
      },
      commentText: "Primeira vez aqui, amei! ⭐",
      displayString: "R$ 15,00",
      amountMicros: 15000000,
      currency: "BRL",
      createdAt: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
    }
  },
  {
    id: "MOCK_5",
    snippet: {
      channelId: "UC_mock_channel_5",
      supporterDetails: {
        displayName: "Carlos Lima",
        profileImageUrl: "https://ui-avatars.com/api/?name=Carlos+Lima&background=random",
        channelUrl: "https://youtube.com/@carloslima"
      },
      commentText: "👏👏👏",
      displayString: "R$ 10,00",
      amountMicros: 10000000,
      currency: "BRL",
      createdAt: new Date(Date.now() - 172800000).toISOString() // 2 dias atrás
    }
  }
];

// Mock com paginação
export const MOCK_PAGINATED_RESPONSE = {
  items: MOCK_SUPER_CHATS,
  nextPageToken: "MOCK_NEXT_PAGE_TOKEN",
  pageInfo: {
    totalResults: MOCK_SUPER_CHATS.length,
    resultsPerPage: MOCK_SUPER_CHATS.length
  }
};

/**
 * Verifica se é um token real do Google
 * Tokens reais começam com "ya29."
 */
export const isRealGoogleToken = (token: string | null): boolean => {
  if (!token) return false;
  return token.startsWith('ya29.');
};

/**
 * Função principal que decide se usa API real ou mock
 */
export const getSuperChatsData = async (
  token: string | null,
  apiCall: () => Promise<any>,
  mockCall: () => Promise<any>
): Promise<any> => {
  
  // Se não tiver token, sempre usa mock
  if (!token || token.includes("ya29")) {
    console.log('🔧 Usando MOCK DATA (sem token)');
    return mockCall();
  }

  // Verifica se é token real (começa com ya29.)
  if (isRealGoogleToken(token)) {
    console.log('✅ Token Google real detectado, chamando API...');
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      console.error('❌ Erro na API real, fallback para mock:', error);
      return mockCall();
    }
  } else {
    console.log('🔧 Token não parece ser do Google (não começa com ya29.), usando MOCK DATA');
    return mockCall();
  }
};

/**
 * Versão síncrona para testes rápidos
 */
export const getMockSuperChats = (): SuperChatResponse => {
  return {
    kind: "youtube#superChatEventListResponse",
    etag: "MOCK_ETAG",
    nextPageToken: MOCK_SUPER_CHATS.length > 3 ? "MOCK_NEXT_PAGE" : undefined,
    pageInfo: {
      totalResults: MOCK_SUPER_CHATS.length,
      resultsPerPage: MOCK_SUPER_CHATS.length
    },
    items: MOCK_SUPER_CHATS
  };
};

// Tipos para usar no componente
export interface SuperChatEvent {
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

export interface SuperChatResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: SuperChatEvent[];
}