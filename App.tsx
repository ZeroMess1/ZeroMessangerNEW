import { useState, useEffect } from 'react'
import { MessageSquare, User as UserIcon, Settings, Send, Search } from 'lucide-react'

type User = {
  id: string
  email: string
  name: string
  password: string
  avatar: string
  bio: string
  birthdate: string
  isOnline: boolean
  lastSeen: string
  hideBirthdate: boolean
}

type Message = {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  recipientId: string
  content: string
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
  deletedFor: string[]
}

type Chat = {
  id: string
  recipient: User
  messages: Message[] | null
}

const getRandomAvatar = (id: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}&backgroundColor=random`
}

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

  const handleLogin = (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('zero_users') || '[]')
    const found = users.find((u: User) => u.email === email && u.password === password)
    
    if (found) {
      setUser(found)
      localStorage.setItem('zero_auth', JSON.stringify(found))
      setShowAuth(null)
    } else {
      alert('Неверный email или пароль')
    }
  }

  const handleRegister = (email: string, password: string, name: string) => {
    const users = JSON.parse(localStorage.getItem('zero_users') || '[]')
    
    if (users.find((u: User) => u.email === email)) {
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

    users.push(newUser)
    localStorage.setItem('zero_users', JSON.stringify(users))
    setUser(newUser)
    localStorage.setItem('zero_auth', JSON.stringify(newUser))
    setShowAuth(null)
  }

  const handleSearch = () => {
    if (!searchQuery || searchQuery.length !== 4) return
    
    const users = JSON.parse(localStorage.getItem('zero_users') || '[]')
    const found = users.find((u: User) => u.id === searchQuery)
    
    if (found) {
      setSearchResults([found])
    } else {
      setSearchResults([])
    }
  }

  const handleChatSelect = (targetUser: User) => {
    const messages = JSON.parse(localStorage.getItem('zero_messages') || '[]')
    const chatMessages = messages.filter((m: Message) => 
      (m.senderId === user.id && m.recipientId === targetUser.id) ||
      (m.senderId === targetUser.id && m.recipientId === user.id)
    )
    
    setSelectedChat({
      id: `${targetUser.id}-${targetUser.name}`,
      recipient: targetUser,
      messages: chatMessages
    })
    setTab('chats')
  }

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat || !user) return

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

    const messages = JSON.parse(localStorage.getItem('zero_messages') || '[]')
    messages.push(newMessage)
    localStorage.setItem('zero_messages', JSON.stringify(messages))

    setMessage('')
    setSelectedChat({
      ...selectedChat,
      messages: [...(selectedChat.messages || []), newMessage]
    })
  }

  const handleDeleteMessage = (msg: Message, option: 'me' | 'everyone') => {
    const messages = JSON.parse(localStorage.getItem('zero_messages') || '[]')
    const index = messages.findIndex((m: Message) => m.id === msg.id)
    
    if (index !== -1) {
      const deletedFor = option === 'me' ? [...msg.deletedFor, user?.id] : []
      
      if (option === 'everyone') {
        messages[index].content = 'Удалено'
      } else {
        messages[index].deletedFor = deletedFor
      }
      
      localStorage.setItem('zero_messages', JSON.stringify(messages))
      
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
    }
    
    setDeleteOptions(null)
    setShowMessageOptions(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <MessageSquare style={{ width: 64, height: 64, margin: '0 auto 16px' }} />
          <p style={{ fontSize: 20 }}>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (showAuth) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <MessageSquare style={{ width: 80, height: 80, margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 32, fontWeight: 'bold' }}>Zero Messenger</h1>
          </div>
          
          {showAuth === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>Вход</h2>
              <input
                type="email"
                placeholder="Email"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const email = (e.target as HTMLInputElement).value
                    const password = (document.querySelector('input[type="password"]') as HTMLInputElement).value
                    handleLogin(email, password)
                  }
                }}
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <input
                type="password"
                placeholder="Пароль"
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <button
                onClick={() => {
                  const email = (document.querySelector('input[type="email"]') as HTMLInputElement).value
                  const password = (document.querySelector('input[type="password"]') as HTMLInputElement).value
                  handleLogin(email, password)
                }}
                style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 16, cursor: 'pointer' }}
              >
                Войти
              </button>
              <p style={{ textAlign: 'center', color: '#666' }}>
                Нет аккаунта?{' '}
                <button onClick={() => setShowAuth('register')} style={{ color: '#fff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Зарегистрироваться
                </button>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>Регистрация</h2>
              <input
                type="text"
                placeholder="Имя"
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <input
                type="email"
                placeholder="Email"
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <input
                type="password"
                placeholder="Пароль"
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <button
                onClick={() => {
                  const inputs = document.querySelectorAll('input')
                  const name = inputs[0].value
                  const email = inputs[1].value
                  const password = inputs[2].value
                  handleRegister(email, password, name)
                }}
                style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 16, cursor: 'pointer' }}
              >
                Зарегистрироваться
              </button>
              <p style={{ textAlign: 'center', color: '#666' }}>
                Есть аккаунт?{' '}
                <button onClick={() => setShowAuth('login')} style={{ color: '#fff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
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
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <MessageSquare style={{ width: 80, height: 80, margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 32, fontWeight: 'bold' }}>Zero Messenger</h1>
            <p style={{ color: '#666', marginTop: 8 }}>Мессенджер в черно-белом стиле</p>
          </div>
          <button
            onClick={() => setShowAuth('login')}
            style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 16, cursor: 'pointer' }}
          >
            Вход
          </button>
          <button
            onClick={() => setShowAuth('register')}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#fff', fontWeight: 'bold', borderRadius: 8, border: '1px solid #fff', fontSize: 16, padding: 16, cursor: 'pointer' }}
          >
            Регистрация
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 16, borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 'bold' }}>Zero Messenger</h1>
          {selectedChat ? (
            <button onClick={() => setSelectedChat(null)} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Назад
            </button>
          ) : tab === 'chats' && (
            <button onClick={() => setSearchResults([])}>
              <MessageSquare style={{ width: 24, height: 24 }} />
            </button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {selectedChat ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #222' }}>
              <img src={selectedChat.recipient.avatar} style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <div>
                <h2 style={{ fontWeight: 'bold' }}>{selectedChat.recipient.name}</h2>
                <p style={{ fontSize: 14, color: '#666' }}>ID: {selectedChat.recipient.id}</p>
              </div>
            </div>
            
            {(selectedChat.messages || []).map(m => {
              if (m.content === 'Удалено' || (m.deletedFor.includes(user.id))) return null
              return (
                <div 
                  key={m.id}
                  style={{
                    marginTop: 16,
                    padding: 12,
                    maxWidth: '80%',
                    borderRadius: 8,
                    backgroundColor: m.senderId === user.id ? '#111' : '#222',
                    marginLeft: m.senderId === user.id ? 'auto' : 0,
                    cursor: m.senderId === user.id ? 'pointer' : 'default'
                  }}
                  onClick={() => m.senderId === user.id && setShowMessageOptions(m.id)}
                >
                  <p>{m.content}</p>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, fontSize: 12, color: '#666' }}>
                    {new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {m.senderId === user.id && <span style={{ marginLeft: 8 }}>{m.status === 'read' ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              )
            })}
            
            {(!selectedChat.messages || selectedChat.messages.length === 0) && (
              <div style={{ textAlign: 'center', color: '#666', marginTop: 32 }}>
                <MessageSquare style={{ width: 48, height: 48, margin: '0 auto 16px' }} />
                <p>Начните диалог</p>
              </div>
            )}
          </div>
        ) : tab === 'chats' && searchResults.length > 0 ? (
          <div style={{ padding: 16 }}>
            <button onClick={() => setSearchResults([])} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Вернуться к чатам
            </button>
            {searchResults.map(u => (
              <div
                key={u.id}
                onClick={() => handleChatSelect(u)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#111', borderRadius: 8, marginTop: 8, cursor: 'pointer' }}
              >
                <img src={u.avatar} style={{ width: 48, height: 48, borderRadius: '50%' }} />
                <div>
                  <h3 style={{ fontWeight: 'bold' }}>{u.name}</h3>
                  <p style={{ fontSize: 14, color: '#666' }}>ID: {u.id}</p>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'chats' ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Поиск по ID (4 цифры)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{ flex: 1, backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 12 }}
              />
              <button
                onClick={handleSearch}
                style={{ padding: 12, backgroundColor: '#fff', color: '#000', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              >
                <Search style={{ width: 20, height: 20 }} />
              </button>
            </div>
            
            <div style={{ textAlign: 'center', color: '#666', marginTop: 32 }}>
              <Search style={{ width: 64, height: 64, margin: '0 auto 16px' }} />
              <p>Найдите человека по ID из 4 цифр<br/>чтобы начать общение</p>
            </div>
          </div>
        ) : tab === 'profile' ? (
          <ProfilePage user={user} setUser={setUser} />
        ) : (
          <SettingsPage user={user} setUser={setUser} />
        )}
      </main>

      {selectedChat && (
        <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, padding: 16, backgroundColor: '#000', borderTop: '1px solid #222' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Сообщение..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 12 }}
            />
            <button
              onClick={handleSendMessage}
              style={{ padding: 12, backgroundColor: '#fff', color: '#000', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            >
              <Send style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#000', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-around', padding: 8 }}>
        <button
          onClick={() => setTab('chats')}
          style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: tab === 'chats' ? '#fff' : '#444' }}
        >
          <MessageSquare style={{ width: 24, height: 24 }} />
        </button>
        <button
          onClick={() => setTab('settings')}
          style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: tab === 'settings' ? '#fff' : '#444' }}
        >
          <Settings style={{ width: 24, height: 24 }} />
        </button>
        <button
          onClick={() => setTab('profile')}
          style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: tab === 'profile' ? '#fff' : '#444' }}
        >
          <UserIcon style={{ width: 24, height: 24 }} />
        </button>
      </nav>

      {showMessageOptions && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: 16, width: '100%', maxWidth: 320 }}>
            <button
              onClick={() => setDeleteOptions(showMessageOptions)}
              style={{ width: '100%', padding: 12, color: '#ff4444', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Удалить сообщение
            </button>
            <button
              onClick={() => setShowMessageOptions(null)}
              style={{ width: '100%', padding: 12, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {deleteOptions && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: 16, width: '100%', maxWidth: 320 }}>
            <button
              onClick={() => {
                const msg = selectedChat?.messages?.find(m => m.id === deleteOptions)
                if (msg) handleDeleteMessage(msg, 'me')
              }}
              style={{ width: '100%', padding: 12, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Удалить у меня
            </button>
            <button
              onClick={() => {
                const msg = selectedChat?.messages?.find(m => m.id === deleteOptions)
                if (msg) handleDeleteMessage(msg, 'everyone')
              }}
              style={{ width: '100%', padding: 12, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Удалить у всех
            </button>
            <button
              onClick={() => setDeleteOptions(null)}
              style={{ width: '100%', padding: 12, color: '#666', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfilePage({ user, setUser }: { user: User, setUser: (u: User) => void }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(user)

  const handleSave = () => {
    setUser(formData)
    setEditing(false)
    localStorage.setItem('zero_auth', JSON.stringify(formData))
    
    const users = JSON.parse(localStorage.getItem('zero_users') || '[]')
    const index = users.findIndex((u: User) => u.id === user.id)
    if (index !== -1) {
      users[index] = formData
      localStorage.setItem('zero_users', JSON.stringify(users))
    }
  }

  if (editing) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <img src={user.avatar} style={{ width: 80, height: 80, borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>{user.name}</h2>
            <p style={{ color: '#666' }}>ID: {user.id}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 4 }}>Имя</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 12 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 4 }}>Обо мне</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', height: 80, resize: 'vertical', padding: 12 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#666', marginBottom: 4 }}>Дата рождения</label>
            <input
              type="date"
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 12 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{ flex: 1, backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 12, cursor: 'pointer' }}>
              Сохранить
            </button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, backgroundColor: '#333', color: '#fff', borderRadius: 8, border: 'none', fontSize: 16, padding: 12, cursor: 'pointer' }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img src={user.avatar} style={{ width: 80, height: 80, borderRadius: '50%' }} />
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>{user.name}</h2>
          <p style={{ color: '#666' }}>ID: {user.id}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, color: '#666' }}>Обо мне</p>
          <p>{user.bio || 'Не указано'}</p>
        </div>
        <div>
          <p style={{ fontSize: 14, color: '#666' }}>Дата рождения</p>
          <p>{user.birthdate || 'Не указана'}</p>
        </div>
        <div>
          <p style={{ fontSize: 14, color: '#666' }}>Email</p>
          <p>{user.email}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 12, cursor: 'pointer' }}
        >
          Редактировать
        </button>
      </div>
    </div>
  )
}

function SettingsPage({ user, setUser }: { user: User, setUser: (u: User) => void }) {
  const handleToggle = (key: keyof User) => {
    const updated = { ...user, [key]: !user[key] }
    setUser(updated)
    localStorage.setItem('zero_auth', JSON.stringify(updated))
    
    const users = JSON.parse(localStorage.getItem('zero_users') || '[]')
    const index = users.findIndex((u: User) => u.id === user.id)
    if (index !== -1) {
      users[index] = updated
      localStorage.setItem('zero_users', JSON.stringify(users))
    }
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#111', borderRadius: 8 }}>
        <div>
          <p style={{ fontWeight: 'bold' }}>Скрыть дату рождения</p>
          <p style={{ fontSize: 14, color: '#666' }}>Ваш возраст будет скрыт от других</p>
        </div>
        <button
          onClick={() => handleToggle('hideBirthdate')}
          style={{ width: 48, height: 24, borderRadius: 12, backgroundColor: user.hideBirthdate ? '#fff' : '#333', border: 'none', cursor: 'pointer', position: 'relative' }}
        >
          <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#000', position: 'absolute', top: 2, left: user.hideBirthdate ? 26 : 2 }} />
        </button>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem('zero_auth')
          setUser(null as any)
        }}
        style={{ width: '100%', padding: 16, backgroundColor: '#cc0000', color: '#fff', fontWeight: 'bold', borderRadius: 8, border: 'none', cursor: 'pointer' }}
      >
        Выйти из аккаунта
      </button>
    </div>
  )
  }
