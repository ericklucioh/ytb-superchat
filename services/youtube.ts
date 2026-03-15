 // types/youtube.types.ts
export interface SuperChatEvent {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    channelId: string;
    supporterDetails: {
      channelId: string;
      channelUrl: string;
      displayName: string;
      profileImageUrl: string;
    };
    commentText: string;
    createdAt: string;
    amountMicros: number;
    currency: string;
    displayString: string;
    messageType: number;
    isSuperStickerEvent: boolean;
    superStickerMetadata?: {
      stickerId: string;
      altText: string;
      language: string;
    };
  };
}

export interface SuperChatListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: SuperChatEvent[];
}

// services/youtube.service.ts
import axios from 'axios';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export class YouTubeSuperChatService {
  private apiKey: string;
  private accessToken: string;

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  /**
   * Lista eventos de Super Chat dos últimos 30 dias
   * @param params Parâmetros da requisição
   */
  async listSuperChatEvents(params?: {
    part?: string[];
    hl?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<SuperChatListResponse> {
    try {
      const response = await axios.get<SuperChatListResponse>(`${BASE_URL}/superChatEvents`, {
        params: {
          part: params?.part?.join(',') || 'snippet',
          hl: params?.hl || 'pt-BR',
          maxResults: params?.maxResults || 20,
          pageToken: params?.pageToken,
          key: this.apiKey
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro ao buscar Super Chats: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Busca todas as páginas de Super Chats (recursivamente)
   */
  async listAllSuperChatEvents(params?: {
    hl?: string;
    maxResults?: number;
  }): Promise<SuperChatEvent[]> {
    let allItems: SuperChatEvent[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.listSuperChatEvents({
        ...params,
        pageToken
      });

      allItems = [...allItems, ...response.items];
      pageToken = response.nextPageToken;

    } while (pageToken);

    return allItems;
  }

  /**
   * Busca apenas Super Chats recentes (última hora)
   */
  async listRecentSuperChats(minutes: number = 60): Promise<SuperChatEvent[]> {
    const allChats = await this.listAllSuperChatEvents({ maxResults: 50 });
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    return allChats.filter(chat => 
      new Date(chat.snippet.createdAt) >= cutoffTime
    );
  }
}

// Exemplo de uso:
async function exemplo() {
  const service = new YouTubeSuperChatService(
    'SUA_API_KEY',
    'SEU_ACCESS_TOKEN'
  );

  try {
    // Buscar Super Chats
    const superChats = await service.listSuperChatEvents({
      maxResults: 10,
      hl: 'pt-BR'
    });

    console.log(`Total: ${superChats.pageInfo.totalResults}`);
    
    superChats.items.forEach(chat => {
      console.log({
        usuario: chat.snippet.supporterDetails.displayName,
        valor: chat.snippet.displayString,
        mensagem: chat.snippet.commentText,
        data: chat.snippet.createdAt
      });
    });

    // Buscar apenas Super Chats dos últimos 30 minutos
    const recentes = await service.listRecentSuperChats(30);
    console.log(`${recentes.length} Super Chats nos últimos 30min`);

  } catch (error) {
    console.error('Erro:', error);
  }
}