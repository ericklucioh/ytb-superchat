// app/superchat/components/MessageList.tsx
'use client';

import { StoredSuperChat } from './types';
import { MessageCard } from './MessageCard';

interface MessageListProps {
  messages: StoredSuperChat[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemoveMessage: (id: string) => void;
}

export const MessageList = ({ messages, onMarkAsRead, onMarkAllAsRead, onRemoveMessage }: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#666',
        fontSize: '16px'
      }}>
        📭 Nenhuma mensagem no storage
      </div>
    );
  }

  const naoLidas = messages.filter(s => !s.is_readed).length;

  // 🆕 ORDENAÇÃO: mais caras primeiro, depois mais antigas
  const sortedMessages = [...messages].sort((a, b) => {
    // Primeiro critério: valor (maior para menor)
    const valueA = a.message.snippet.amountMicros;
    const valueB = b.message.snippet.amountMicros;
    
    if (valueA !== valueB) {
      return valueB - valueA; // Decrescente (maior primeiro)
    }
    
    // Segundo critério: data (mais antiga primeiro)
    const dateA = new Date(a.message.snippet.createdAt).getTime();
    const dateB = new Date(b.message.snippet.createdAt).getTime();
    
    return dateA - dateB; // Crescente (mais antiga primeiro)
  });

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '14px'
          }}>
            📚 TOTAL: {messages.length}
          </span>
          <span style={{
            backgroundColor: '#FFC107',
            color: '#333',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '14px'
          }}>
            🆕 Não lidas: {naoLidas}
          </span>
        </div>
        
        {naoLidas > 0 && (
          <button
            onClick={onMarkAllAsRead}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ✅ Marcar todas como lidas
          </button>
        )}
      </div>

      <div>
        {sortedMessages.map((item) => (
          <MessageCard 
            key={item.message.id} 
            item={item} 
            onMarkAsRead={onMarkAsRead}
            onRemove={onRemoveMessage}
          />
        ))}
      </div>
    </div>
  );
};