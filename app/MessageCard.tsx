// app/superchat/components/MessageCard.tsx
'use client';

import { useState } from 'react';
import { StoredSuperChat } from './types';

interface MessageCardProps {
  item: StoredSuperChat;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void; // Nova prop para remover
}

export const MessageCard = ({ item, onMarkAsRead, onRemove }: MessageCardProps) => {
  const [isRead, setIsRead] = useState(item.is_readed);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const handleClick = () => {
    if (!isRead) {
      setIsRead(true);
      onMarkAsRead(item.message.id);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique no botão ative o handleClick
    setIsRemoving(true);
    
    // Pequeno delay para a animação
    setTimeout(() => {
      onRemove(item.message.id);
    }, 300);
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '1px solid #eee',
        borderLeft: `4px solid ${isRead ? '#4CAF50' : '#FFC107'}`,
        backgroundColor: isRead ? '#f9f9f9' : '#fff9e6',
        marginBottom: '12px',
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? 'translateX(100%)' : 'translateX(0)',
        position: 'relative' as const
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flex: 1
        }}>
          <img 
            src={item.message.snippet.supporterDetails.profileImageUrl} 
            alt={item.message.snippet.supporterDetails.displayName}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {item.message.snippet.supporterDetails.displayName}
              {!isRead && (
                <span style={{
                  backgroundColor: '#FFC107',
                  color: '#333',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  NOVO
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#2ecc71'
          }}>
            {item.message.snippet.displayString}
          </div>
          
          {/* Botão de lida */}
          <button
            onClick={handleRemove}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              opacity: 0.8,
              ':hover': {
                opacity: 1,
                transform: 'scale(1.05)'
              }
            }}
            title="Marcar como lida e remover"
          >
            <span>✅</span> Lida
          </button>
        </div>
      </div>

      {item.message.snippet.commentText && (
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          💬 {item.message.snippet.commentText}
        </div>
      )}
    </div>
  );
};