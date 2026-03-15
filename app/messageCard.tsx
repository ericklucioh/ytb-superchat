const MessageCard = ({ item, index }: { item: StoredSuperChat; index: number }) => {
  const [isRead, setIsRead] = useState(item.is_readed);
  
  const handleMarkAsRead = () => {
    if (!isRead) {
      setIsRead(true);
      // Aqui você pode chamar uma função do pai para atualizar o storage
      // markAsRead(item.message.id);
    }
  };

  return (
    <div 
      onClick={handleMarkAsRead}
      style={{
        ...styles.messageCard,
        borderLeft: `4px solid ${isRead ? '#4CAF50' : '#FFC107'}`,
        backgroundColor: isRead ? '#f9f9f9' : '#fff9e6'
      }}
    >
      <div style={styles.messageHeader}>
        <div style={styles.userInfo}>
          <img 
            src={item.message.snippet.supporterDetails.profileImageUrl} 
            alt={item.message.snippet.supporterDetails.displayName}
            style={styles.avatar}
          />
          <div>
            <div style={styles.userName}>
              {item.message.snippet.supporterDetails.displayName}
              {!isRead && <span style={styles.newBadge}>NOVO</span>}
            </div>
            <div style={styles.userChannel}>
              {item.message.snippet.supporterDetails.channelUrl}
            </div>
          </div>
        </div>
        <div style={styles.amount}>
          {item.message.snippet.displayString}
        </div>
      </div>

      {item.message.snippet.commentText && (
        <div style={styles.message}>
          💬 {item.message.snippet.commentText}
        </div>
      )}

      <div style={styles.messageFooter}>
        <span style={styles.date}>
          📅 {new Date(item.message.snippet.createdAt).toLocaleString('pt-BR')}
        </span>
        <span style={styles.messageId}>
          🆔 {item.message.id.substring(0, 8)}...
        </span>
      </div>
    </div>
  );
};

// Componente principal de listagem
export const MessageList = () => {
  if (storedSuperChats.length === 0) {
    return (
      <div style={styles.emptyState}>
        📭 Nenhuma mensagem no storage
      </div>
    );
  }

  const naoLidas = storedSuperChats.filter(s => !s.is_readed).length;

  return (
    <div>
      {/* Cabeçalho com estatísticas */}
      <div style={styles.statsHeader}>
        <span style={styles.totalBadge}>
          📚 TOTAL: {storedSuperChats.length}
        </span>
        <span style={styles.unreadBadge}>
          🆕 Não lidas: {naoLidas}
        </span>
      </div>

      {/* Lista de mensagens */}
      <div style={styles.messageList}>
        {storedSuperChats.map((item, index) => (
          <MessageCard 
            key={item.message.id} 
            item={item} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

// Estilos organizados
const styles = {
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  },
  statsHeader: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px'
  },
  totalBadge: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '14px'
  },
  unreadBadge: {
    backgroundColor: '#FFC107',
    color: '#333',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '14px'
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  messageCard: {
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #eee',
    ':hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
    }
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  userInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover' as const
  },
  userName: {
    fontWeight: 'bold',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  newBadge: {
    backgroundColor: '#FFC107',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  userChannel: {
    fontSize: '12px',
    color: '#666'
  },
  amount: {
    fontWeight: 'bold',
    fontSize: '18px',
    color: '#2ecc71'
  },
  message: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '10px',
    fontSize: '14px'
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#999'
  },
  date: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  messageId: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: 'monospace'
  }
};