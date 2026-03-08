import { useState, useEffect } from 'react'
import { MessageSquare, User as UserIcon, Settings, Send, Search, MoreVertical, FileText, Sparkles } from 'lucide-react'
import type { User, Message, Chat } from './types'
import { supabase } from './lib/supabase'
import { getRandomAvatar } from './lib/images'
import { cn } from './lib/utils'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<'chats' | 'profile' | 'settings'>('chats')
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null)
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [showMessageOptions, setShowMessageOptions] = useState<string | null>(null)
  const [deleteOptions, setDeleteOptions] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Инициализация
  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    try {
      const storedAuth = localStorage.getItem('zero_auth')
      if (storedAuth) {
        const userData = JSON.parse(storedAuth)
        setUser(userData)
      }
    } catch (e) {
      console.error('Auth init error:', e)
    }
    setLoading(false)
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()
      
      if (error) throw error
      
      if (data) {
        setUser(data)
        localStorage.setItem('zero_auth', JSON.stringify(data))
        setShowAuth(null)
      } else {
        alert('Неверный email или пароль')
      }
    } catch (e) {
      console.error('Login error:', e)
      alert('Ошибка входа')
    }
  }

  const handleRegister = async (email: string, password: string, name: string) => {
    try {
      // Проверяем существующего пользователя
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
      
      if (existing) {
        alert('Такой email уже зарегистрирован')
        return
      }

      const randomId = Math.floor(1000 + Math.random() * 9000).toString()
      
      const newUser: User = {
        id: randomId,
        email,
        name,
        password,
        avatar: getRandomAvatar(randomId),
        bio: '',
        birthdate: '',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        hideBirthdate: false
      }

      const { error } = await supabase
        .from('users')
        .insert(newUser)
      
      if (error) throw error

      setUser(newUser)
      localStorage.setItem('zero_auth', JSON.stringify(newUser))
      setShowAuth(null)
    } catch (e) {
      console.error('Register error:', e)
      alert('Ошибка регистрации')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length !== 4) return
    
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', searchQuery)
        .limit(1)
      
      if (data && data.length > 0) {
        setSearchResults([data[0]])
      } else {
        setSearchResults([])
      }
    } catch (e) {
      console.error('Search error:', e)
    }
  }

  const handleChatSelect = (user: User) => {
    setSelectedChat({
      id: `${user.id}-${user.name}`,
      recipient: user,
      messages: []
    })
    setTab('chats')
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat || !user) return

    try {
      const newMessage: Message = {
        id: `${Date.now()}`,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        recipientId: selectedChat.recipient.id,
        content: message,
        timestamp: new Date().toISOString(),
        status: 'sent',
        deletedFor: []
      }

      const { error } = await supabase
        .from('messages')
        .insert(newMessage)
      
      if (error) throw error

      setMessage('')
      setSelectedChat({
        ...selectedChat,
        messages: [...(selectedChat.messages || []), newMessage]
      })
    } catch (e) {
      console.error('Send message error:', e)
    }
  }

  const handleDeleteMessage = async (msg: Message, option: 'me' | 'everyone') => {
    try {
      const deletedFor = option === 'me' ? [...msg.deletedFor, user?.id] : []
      
      const { error } = await supabase
        .from('messages')
        .update({ 
          deletedFor,
          content: option === 'everyone' ? 'Удалено' : msg.content
        })
        .eq('id', msg.id)
      
      if (error) throw error

      setDeleteOptions(null)
      setShowMessageOptions(null)
      
      if (selectedChat) {
        setSelectedChat({
          ...selectedChat,
          messages: selectedChat.messages?.map(m => 
            m.id === msg.id 
              ? { ...m, deletedFor, content: option === 'everyone' ? 'Удалено' : m.content }
              : m
          )
        })
      }
    } catch (e) {
      console.error('Delete message error:', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-xl">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <MessageSquare className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Zero Messenger</h1>
          </div>
          
          {showAuth === 'login' ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Вход</h2>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement
                    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
                    if (passwordInput) handleLogin(target.value, passwordInput.value)
                  }
                }}
              />
              <input
                type="password"
                placeholder="Пароль"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
              <button
                onClick={() => {
                  const email = (document.querySelector('input[type="email"]') as HTMLInputElement).value
                  const password = (document.querySelector('input[type="password"]') as HTMLInputElement).value
                  handleLogin(email, password)
                }}
                className="w-full p-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Войти
              </button>
              <p className="text-center text-gray-400">
                Нет аккаунта?{' '}
                <button onClick={() => setShowAuth('register')} className="text-white underline">
                  Зарегистрироваться
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Регистрация</h2>
              <input
                type="text"
                placeholder="Имя"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
              <input
                type="password"
                placeholder="Пароль"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
              <button
                onClick={() => {
                  const name = (document.querySelector('input[type="text"]') as HTMLInputElement).value
                  const email = (document.querySelectorAll('input[type="email"]')[1] as HTMLInputElement).value
                  const password = (document.querySelectorAll('input[type="password"]')[1] as HTMLInputElement).value
                  handleRegister(email, password, name)
                }}
                className="w-full p-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Зарегистрироваться
              </button>
              <p className="text-center text-gray-400">
                Есть аккаунт?{' '}
                <button onClick={() => setShowAuth('login')} className="text-white underline">
                  Войти
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <MessageSquare className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Zero Messenger</h1>
            <p className="text-gray-400 mt-2">Мессенджер в черно-белом стиле</p>
          </div>
          <button
            onClick={() => setShowAuth('login')}
            className="w-full p-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Вход
          </button>
          <button
            onClick={() => setShowAuth('register')}
            className="w-full p-3 border border-white text-white font-bold rounded-lg hover:bg-gray-900 transition-colors"
          >
            Регистрация
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Zero Messenger</h1>
          {selectedChat ? (
            <button
              onClick={() => setSelectedChat(null)}
              className="text-gray-400 hover:text-white"
            >
              Назад
            </button>
          ) : tab === 'chats' && (
            <button onClick={() => setSearchResults([])}>
              <MessageSquare className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {selectedChat ? (
          <div className="p-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-800">
              <img src={selectedChat.recipient.avatar} className="w-12 h-12 rounded-full" />
              <div>
                <h2 className="font-bold">{selectedChat.recipient.name}</h2>
                <p className="text-sm text-gray-400">ID: {selectedChat.recipient.id}</p>
              </div>
            </div>
            
            {selectedChat.messages && selectedChat.messages.map(m => m.content !== 'Удалено' && (
              !m.deletedFor.includes(user.id) && (
                <div 
                  key={m.id}
                  className={cn(
                    "mt-4 p-3 max-w-[80%] rounded-lg",
                    m.senderId === user.id 
                      ? "ml-auto bg-gray-800" 
                      : "mr-auto bg-gray-700"
                  )}
                  onClick={() => {
                    if (m.senderId === user.id) setShowMessageOptions(m.id)
                  }}
                >
                  <p>{m.content}</p>
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    {new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {m.senderId === user.id && (
                      <span className="ml-2">
                        {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                  {showMessageOptions === m.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-black border border-gray-700 rounded-lg p-4 w-full max-w-sm space-y-2">
                        <button
                          onClick={() => setDeleteOptions(m.id)}
                          className="w-full p-3 text-red-500 text-left hover:bg-gray-900 rounded-lg"
                        >
                          Удалить сообщение
                        </button>
                        <button
                          onClick={() => setShowMessageOptions(null)}
                          className="w-full p-3 text-left hover:bg-gray-900 rounded-lg"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                  {deleteOptions === m.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-black border border-gray-700 rounded-lg p-4 w-full max-w-sm space-y-2">
                        <button
                          onClick={() => handleDeleteMessage(m, 'me')}
                          className="w-full p-3 text-left hover:bg-gray-900 rounded-lg"
                        >
                          Удалить у меня
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(m, 'everyone')}
                          className="w-full p-3 text-left hover:bg-gray-900 rounded-lg"
                        >
                          Удалить у всех
                        </button>
                        <button
                          onClick={() => setDeleteOptions(null)}
                          className="w-full p-3 text-gray-400 text-left hover:bg-gray-900 rounded-lg"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            ))}
            
            {selectedChat.messages === null && (
              <div className="text-center text-gray-400 mt-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <p>Начните диалог</p>
              </div>
            )}
          </div>
        ) : tab === 'chats' && searchResults.length > 0 ? (
          <div className="p-4 space-y-4">
            <button onClick={() => setSearchResults([])} className="text-gray-400">
              ← Вернуться к чатам
            </button>
            {searchResults.map(u => (
              <div
                key={u.id}
                onClick={() => handleChatSelect(u)}
                className="flex items-center space-x-3 p-3 bg-gray-900 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <img src={u.avatar} className="w-12 h-12 rounded-full" />
                <div>
                  <h3 className="font-bold">{u.name}</h3>
                  <p className="text-sm text-gray-400">ID: {u.id}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          tab === 'chats' ? (
            <div className="p-4">
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Поиск по ID (4 цифры)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                />
                <button
                  onClick={handleSearch}
                  className="p-3 bg-white text-black rounded-lg hover:bg-gray-200"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-center text-gray-400 mt-8 space-y-4">
                <Search className="w-16 h-16 mx-auto" />
                <p>
                  Найдите человека по ID из 4 цифр<br/>
                  чтобы начать общение
                </p>
              </div>
            </div>
          ) : tab === 'profile' ? (
            <ProfilePage user={user} setUser={setUser} />
          ) : (
            <SettingsPage user={user} setUser={setUser} />
          )
        )}
      </main>

      {/* Message Input */}
      {selectedChat && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-black border-t border-gray-800">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Сообщение..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
            />
            <button
              onClick={handleSendMessage}
              className="p-3 bg-white text-black rounded-lg hover:bg-gray-200"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around p-2">
        <button
          onClick={() => setTab('chats')}
          className={cn("p-2", tab === 'chats' ? "text-white" : "text-gray-500")}
        >
          <MessageSquare className="w-6 h-6 mx-auto" />
        </button>
        <button
          onClick={() => setTab('settings')}
          className={cn("p-2", tab === 'settings' ? "text-white" : "text-gray-500")}
        >
          <Settings className="w-6 h-6 mx-auto" />
        </button>
        <button
          onClick={() => setTab('profile')}
          className={cn("p-2", tab === 'profile' ? "text-white" : "text-gray-500")}
        >
          <UserIcon className="w-6 h-6 mx-auto" />
        </button>
      </nav>
    </div>
  )
}

function ProfilePage({ user, setUser }: { user: User, setUser: (u: User) => void }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(user)

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user.id)
      
      if (error) throw error

      setUser(formData)
      setEditing(false)
      localStorage.setItem('zero_auth', JSON.stringify(formData))
    } catch (e) {
      console.error('Save profile error:', e)
      alert('Ошибка сохранения')
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center space-x-4">
        <img src={user.avatar} className="w-20 h-20 rounded-full" />
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-gray-400">ID: {user.id}</p>
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Обо мне</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white h-24"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Дата рождения</label>
            <input
              type="date"
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="flex-1 p-3 bg-white text-black font-bold rounded-lg"
            >
              Сохранить
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 p-3 border border-gray-700 rounded-lg"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400">Обо мне</p>
            <p>{user.bio || 'Не указано'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Дата рождения</p>
            <p>{user.birthdate || 'Не указана'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Email</p>
            <p>{user.email}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full p-3 bg-white text-black font-bold rounded-lg"
          >
            Редактировать
          </button>
        </div>
      )}
    </div>
  )
}

function SettingsPage({ user, setUser }: { user: User, setUser: (u: User) => void }) {
  const handleToggle = async (key: keyof User) => {
    const updated = { ...user, [key]: !user[key] }
    try {
      const { error } = await supabase
        .from('users')
        .update(updated)
        .eq('id', user.id)
      
      if (error) throw error

      setUser(updated)
      localStorage.setItem('zero_auth', JSON.stringify(updated))
    } catch (e) {
      console.error('Update settings error:', e)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
        <div>
          <p className="font-bold">Скрыть дату рождения</p>
          <p className="text-sm text-gray-400">Ваш возраст будет скрыт от других</p>
        </div>
        <button
          onClick={() => handleToggle('hideBirthdate')}
          className={cn("w-12 h-6 rounded-full", user.hideBirthdate ? "bg-white" : "bg-gray-700")}
        >
          <div className={cn("w-5 h-5 rounded-full bg-black mt-0.5 transition-all", user.hideBirthdate ? "ml-6" : "ml-1")} />
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
        <div>
          <p className="font-bold">Уведомления</p>
          <p className="text-sm text-gray-400">Уведомлять о новых сообщениях</p>
        </div>
        <button className="w-12 h-6 rounded-full bg-white">
          <div className="w-5 h-5 rounded-full bg-black mt-0.5 ml-6" />
        </button>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem('zero_auth')
          setUser(null as any)
        }}
        className="w-full p-4 bg-red-600 rounded-lg font-bold"
      >
        Выйти из аккаунта
      </button>
    </div>
  )
        }
