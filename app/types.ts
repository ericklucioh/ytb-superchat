// app/superchat/components/types.ts
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

export interface StoredSuperChat {
  is_readed: boolean;
  message: SuperChatEvent;
}

export interface SuperChatResponse {
  items: SuperChatEvent[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}