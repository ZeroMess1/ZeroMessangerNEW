import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auth } from '../firebase/config';
import { subscribeToChatMessages, sendMessage, markMessageAsRead } from '../firebase/services/chats';
import { subscribeToUserProfile, updateUserLastSeen } from '../firebase/services/users2';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { Message } from '../firebase/services/chats';

interface ChatScreenProps {
  chatId: string;
  partnerId: string;
  onBack: () => void;
}

export const ChatScreen = ({ chatId, partnerId, onBack }: ChatScreenProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partner, setPartner] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteModal, setDeleteModal] = useState<'local' | 'everyone' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const unsubMessages = subscribeToChatMessages(chatId, (msgs) => {
      setMessages(msgs);
      scrollToBottom();
      
      // Mark unread messages as read
      if (currentUserId) {
        msgs.forEach(msg => {
          if (msg.senderId !== currentUserId && !msg.read) {
            markMessageAsRead(chatId, msg.id);
          }
        });
      }
    });

    const unsubPartner = subscribeToUserProfile(partnerId, (p) => {
      setPartner(p);
    });

    return () => {
      unsubMessages();
      unsubPartner();
    };
  }, [chatId, partnerId, currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      updateUserLastSeen(currentUserId);
      
      // Update last seen every minute
      const interval = setInterval(() => {
        updateUserLastSeen(currentUserId);
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [currentUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    await sendMessage(chatId, currentUserId, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusText = () => {
    if (!partner || !partner.showOnlineStatus) return '';
    
    const now = new Date();
    const lastSeen = partner.lastSeen?.toDate() || new Date();
    const diffHours = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0.1) return 'В сети';
    if (diffHours < 1) return 'Был недавно';
    if (diffHours < 10) return 'Был недавно';
    return 'Был давно';
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <Avatar 
          name={partner?.name || 'User'} 
          src={partner?.avatarUrl}
          size="lg" 
        />
        
        <div className="flex-1">
          <h2 className="font-semibold">{partner?.name || 'Загрузка...'}</h2>
          <p className="text-sm text-gray-500">{partner?.showOnlineStatus ? getStatusText() : ''}</p>
        </div>

        <p className="text-xs text-gray-400 font-medium">
          ID: {partner?.uniqueId || '----'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          if (msg.deletedFor?.includes(currentUserId || '')) return null;
          
          const isOwn = msg.senderId === currentUserId;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isOwn) {
                  setSelectedMessage(msg);
                }
              }}
            >
              <div
                onDoubleClick={() => {
                  if (isOwn) setSelectedMessage(msg);
                }}
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  isOwn ? 'bg-black text-white rounded-br-sm' : 'bg-gray-100 text-black rounded-bl-sm'
                }`}
              >
                <div className={`break-words ${partner?.fontSize ? `text-[${partner.fontSize}px]` : ''}`}>
                  {msg.text}
                </div>
                
                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                  <span className={`text-[10px] opacity-60`}>
                    {format(msg.timestamp?.toDate() || new Date(), 'HH:mm', { locale: ru })}
                  </span>
                  
                  {isOwn && (
                    <div className="flex items-center">
                      {msg.read ? (
                        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 rounded-xl bg-black text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal isOpen={!!selectedMessage} onClose={() => { setSelectedMessage(null); setDeleteModal(null); }}>
        <h3 className="text-lg font-semibold mb-4">Удалить сообщение?</h3>
        <div className="space-y-2">
          <button
            onClick={() => setDeleteModal('local')}
            className="w-full p-3 rounded-xl bg-gray-100 text-left hover:bg-gray-200 transition-colors"
          >
            Удалить у меня
          </button>
          <button
            onClick={() => setDeleteModal('everyone')}
            className="w-full p-3 rounded-xl bg-red-100 text-red-600 text-left hover:bg-red-200 transition-colors"
          >
            Удалить у всех
          </button>
          {deleteModal === 'everyone' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  if (selectedMessage && currentUserId) {
                    // Delete for everyone implementation
                    setSelectedMessage(null);
                    setDeleteModal(null);
                  }
                }}
                className="flex-1 p-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Да, удалить
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 p-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};