import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { subscribeToUserChats, getChatPartnerId } from '../firebase/services/chats';
import { getUserProfile, updateUserLastSeen } from '../firebase/services/users2';
import { Avatar } from '../components/Avatar';
import { Chat } from '../firebase/services/chats';

interface ChatsListScreenProps {
  onSelectChat: (chatId: string, partnerId: string) => void;
}

export const ChatsListScreen = ({ onSelectChat }: ChatsListScreenProps) => {
  const [chatsData, setChatsData] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;

    const unsub = subscribeToUserChats(currentUserId, async (chatsList) => {
      
      // Load partner profiles
      const partnersData = await Promise.all(
        chatsList.map(async (chat) => {
          const partnerId = getChatPartnerId(chat, currentUserId);
          const partner = await subscribeToUserProfile(partnerId, () => {});
          // Get initial data
          return { chat, partnerId };
        })
      );

      const profiles = await Promise.all(
        partnersData.map(async ({ chat, partnerId }) => {
          const partner = await getPartnerProfile(partnerId);
          return { chat, partner };
        })
      );

      setChatsData(profiles);
    });

    return () => unsub();
  }, [currentUserId]);

  const getPartnerProfile = async (partnerId: string) => {
    const { subscribeToUserProfile: sub } = await import('../firebase/services/users2');
    return new Promise((resolve) => {
      const unsub = sub(partnerId, (profile) => {
        if (profile) {
          resolve(profile);
          unsub();
        }
      });
    });
  };

  useEffect(() => {
    if (currentUserId) {
      updateUserLastSeen(currentUserId);
      const interval = setInterval(() => {
        updateUserLastSeen(currentUserId);
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [currentUserId]);

  const handleSearch = async () => {
    if (!searchId || searchId.length !== 4) return;
    
    setSearching(true);
    setSearchResult(null);

    try {
      const { findUserByIdCode } = await import('../firebase/services/users2');
      const user = await findUserByIdCode(searchId);
      
      if (user) {
        setSearchResult(user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async (partnerId: string) => {
    if (!currentUserId) return;
    
    const { getOrCreateChat } = await import('../firebase/services/chats');
    const chat = await getOrCreateChat(currentUserId, partnerId);
    onSelectChat(chat.id, partnerId);
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(d);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">Zero Messenger</h1>
      </div>

      {/* Search User */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Введите ID (4 цифры)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || searchId.length !== 4}
            className="px-4 py-2.5 rounded-xl bg-black text-white disabled:opacity-30 hover:bg-gray-800 transition-colors"
          >
            {searching ? '😎' : '🔍'}
          </button>
        </div>

        {searchResult && (
          <div
            onClick={() => handleStartChat(searchResult.id)}
            className="mt-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar name={searchResult.name} src={searchResult.avatarUrl} size="lg" />
              <div className="flex-1">
                <p className="font-medium">{searchResult.name}</p>
                <p className="text-sm text-gray-500">ID: {searchResult.uniqueId}</p>
              </div>
              <span className="text-blue-500 text-sm font-medium">Начать чат</span>
            </div>
          </div>
        )}
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {chatsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <p className="text-4xl mb-4">💬</p>
            <p>Нет активных чатов</p>
            <p className="text-sm">Найдите друга по ID и начните общение!</p>
          </div>
        ) : (
          chatsData.map(({ chat, partner }) => (
            <div
              key={chat.id}
              onClick={() => handleStartChat((partner as any)?.id)}
              className="flex items-center gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <Avatar name={(partner as any)?.name || 'User'} src={(partner as any)?.avatarUrl} size="lg" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{(partner as any)?.name || 'Загрузка...'}</h3>
                  {(partner as any)?.lastSeen && (
                    <span className="text-xs text-gray-400">{formatTime((partner as any)?.lastSeen)}</span>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage?.senderId === currentUserId ? '✓ ' : ''}{chat.lastMessage?.text || 'Нет сообщений'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};