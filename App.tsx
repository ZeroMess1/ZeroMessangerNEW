import { useState, useEffect, useRef } from 'react'
import { MessageSquare, User as UserIcon, Settings, Send, Search, Star } from 'lucide-react'
import { firestore, authRetry } from './firebase'
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'

type User = {
  id: string
  searchId: string
  email: string
  name: string
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
  messages: Message[]
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
  const [error, setError] = useState('')
  const messagesUnsubscribe = useRef<(() => void) | null>(null)
  const authUnsubscribe = useRef<(() => void) | null>(null)

  useEffect(() => {
    initApp()
    return () => {
      if (messagesUnsubscribe.current) messagesUnsubscribe.current()
      if (authUnsubscribe.current) authUnsubscribe.current()
    }
  }, [])

  const initApp = () => {
    const auth = getAuth()
    
    authUnsubscribe.current = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Получаем данные пользователя из Firestore
        const userData = await firestore.getUser(firebaseUser.uid)
        if (userData) {
          setUser(userData)
        } else {
          // Если пользователя нет в Firestore, создаем
          const searchId = Math.floor(1000 + Math.random() * 9000).toString()
          const newUser: User = {
            id: firebaseUser.uid,
            searchId,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Пользователь',
            avatar: getRandomAvatar(firebaseUser.uid),
            bio: '',
            birthdate: '',
            isOnline: true,
            lastSeen: new Date().toISOString(),
            hideBirthdate: false
          }
          try {
            await firestore.createUser(firebaseUser.uid, newUser)
          } catch (e) {
            console.warn('Create user error:', e)
          }
          setUser(newUser)
        }
        setShowAuth(null)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
  }

  const handleLogin = async (email: string, password: string) => {
    setError('')
    if (!email || !password) {
      setError('Заполните все поля')
      return
    }

    try {
      const auth = getAuth()
      
      try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password)
      } catch (networkError: any) {
        // Если ошибка сети, пробуем повторить
        if (networkError.code === 'auth/network-request-failed') {
          console.log('Network error, retrying...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          await auth.signInWithEmailAndPassword(email, password)
        } else {
          throw networkError
        }
      }
      
      // Данные пользователя загрузятся автоматически через onAuthStateChanged
      // Показываем loading state пока загружаемся
      setLoading(true)
      
    } catch (e: any) {
      console.error('Login error:', e)
      if (e.code === 'auth/network-request-failed') {
        setError('Ошибка сети. Проверьте подключение к интернету и попробуйте снова.')
      } else if (e.code === 'auth/user-not-found') {
        setError('Пользователь с таким email не найден')
      } else if (e.code === 'auth/wrong-password') {
        setError('Неверный пароль')
      } else if (e.code === 'auth/invalid-email') {
        setError('Неверный email')
      } else if (e.code === 'auth/invalid-credential') {
        setError('Неверный email или пароль')
      } else {
        setError(e.message || 'Ошибка входа')
      }
    }
  }

  const handleRegister = async (email: string, password: string, name: string) => {
    setError('')
    
    if (!name || !email || !password) {
      setError('Заполните все поля')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов')
      return
    }

    try {
      const auth = getAuth()
      let userCredential
      
      try {
        userCredential = await auth.createUserWithEmailAndPassword(email, password)
      } catch (networkError: any) {
        // Если ошибка сети, пробуем повторить
        if (networkError.code === 'auth/network-request-failed') {
          console.log('Network error, retrying...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          userCredential = await auth.createUserWithEmailAndPassword(email, password)
        } else if (networkError.code === 'auth/email-already-in-use') {
          setError('Такой email уже зарегистрирован')
          return
        } else {
          throw networkError
        }
      }

      const uid = userCredential.user.uid
      const searchId = Math.floor(1000 + Math.random() * 9000).toString()
      
      await auth.currentUser?.updateProfile({ displayName: name })
      
      const newUser: User = {
        id: uid,
        searchId,
        email,
        name,
        avatar: getRandomAvatar(uid),
        bio: '',
        birthdate: '',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        hideBirthdate: false
      }

      // Сохраняем в Firestore
      try {
        await firestore.createUser(uid, newUser)
      } catch (e) {
        console.warn('Create user firestore error:', e)
      }
      
      // Сразу устанавливаем пользователя (моментальный вход)
      setUser(newUser)
      setShowAuth(null)
      setLoading(false)
    } catch (e: any) {
      console.error('Register error:', e)
      if (e.code === 'auth/network-request-failed') {
        setError('Ошибка сети. Проверьте подключение к интернету и попробуйте снова.')
      } else if (e.code === 'auth/email-already-in-use') {
        setError('Такой email уже зарегистрирован')
      } else if (e.code === 'auth/weak-password') {
        setError('Пароль слишком слабый')
      } else if (e.code === 'auth/invalid-email') {
        setError('Неверный email')
      } else {
        setError(e.message || 'Ошибка регистрации')
      }
    }
  }

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length !== 4) return
    
    if (searchQuery === '0000') {
      // Избранное - чат с самим собой
      if (!user) return
      
      setSearchResults([{
        id: 'favorites',
        searchId: 'favorites',
        email: '',
        name: 'Избранное',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=favorites&backgroundColor=random`,
        bio: '',
        birthdate: '',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        hideBirthdate: false
      }])
      return
    }
    
    const foundUser = await firestore.getUserBySearchId(searchQuery)
    if (foundUser) {
      setSearchResults([foundUser])
    } else {
      setSearchResults([])
    }
  }

  const handleChatSelect = (targetUser: User) => {
    if (messagesUnsubscribe.current) messagesUnsubscribe.current()
    
    if (targetUser.id === 'favorites') {
      const messages: Message[] = []
      setSelectedChat({
        id: 'favorites',
        recipient: targetUser,
        messages
      })
      setTab('chats')
      
      // Для избранного - загружаем сообщения которые отправлены самому себе
      if (user) {
        messagesUnsubscribe.current = firestore.getMessages(user.id, 'favorites', (msgs) => {
          setTimeout(() => {
            setSelectedChat(prev => prev ? { ...prev, messages: msgs } : null)
          }, 100)
        })
      }
    } else {
      const messages: Message[] = []
      setSelectedChat({
        id: `${targetUser.id}-${targetUser.name}`,
        recipient: targetUser,
        messages
      })
      setTab('chats')
      // Подписываемся на сообщения
      messagesUnsubscribe.current = firestore.getMessages(user?.id || '', targetUser.id, (msgs) => {
        setSelectedChat(prev => prev ? { ...prev, messages: msgs } : null)
      })
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat || !user) return

    // Для избранного - recipientCaption должен быть user.id, а не 'favorites'
    let recipientId = selectedChat.recipient.id
    if (selectedChat.recipient.id === 'favorites') {
      recipientId = user.id // Отправляем сами себе
    }

    const newMessage: Message = {
      id: '',
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      recipientId: recipientId,
      content: message,
      timestamp: new Date().toISOString(),
      status: 'sent',
      deletedFor: []
    }

    try {
      await firestore.sendMessage(newMessage)
      setMessage('')
    } catch (e) {
      console.error('Send message error:', e)
      setError('Ошибка отправки сообщения')
    }
  }

  const handleDeleteMessage = async (msg: Message, option: 'me' | 'everyone') => {
    try {
      const deletedFor = option === 'me' ? [...msg.deletedFor, user?.id || ''] : []
      
      if (option === 'everyone') {
        await firestore.updateMessage(msg.id, { 
          deletedFor,
          content: 'Удалено'
        })
      } else {
        await firestore.updateMessage(msg.id, { deletedFor })
      }
      
      setDeleteOptions(null)
      setShowMessageOptions(null)
    } catch (e) {
      console.error('Delete message error:', e)
    }
  }

  const handleLogout = async () => {
    try {
      if (messagesUnsubscribe.current) messagesUnsubscribe.current()
      if (authUnsubscribe.current) authUnsubscribe.current()
      const auth = getAuth()
      await firebaseSignOut(auth)
      setUser(null)
    } catch (e) {
      console.error('Logout error:', e)
    }
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
          
          {error && (
            <div style={{ backgroundColor: '#330000', color: '#ff6666', padding: 12, marginBottom: 16, borderRadius: 8, border: '1px solid #660000' }}>
              {error}
            </div>
          )}
          
          {showAuth === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>Вход</h2>
              <input
                type="email"
                placeholder="Email"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const password = (document.querySelector('input[type="password"]') as HTMLInputElement)?.value
                    if (password) handleLogin((e.target as HTMLInputElement).value, password)
                  }
                }}
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <input
                type="password"
                placeholder="Пароль"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value
                    if (email) handleLogin(email, (e.target as HTMLInputElement).value)
                  }
                }}
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <button
                onClick={() => {
                  const email = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value || ''
                  const password = (document.querySelector('input[type="password"]') as HTMLInputElement)?.value || ''
                  handleLogin(email, password)
                }}
                style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 16, cursor: 'pointer' }}
              >
                Войти
              </button>
              <p style={{ textAlign: 'center', color: '#666' }}>
                Нет аккаунта?{' '}
                <button onClick={() => { setShowAuth('register'); setError('') }} style={{ color: '#fff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                placeholder="Пароль (минимум 6 символов)"
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, padding: 16 }}
              />
              <button
                onClick={() => {
                  const inputs = document.querySelectorAll('input')
                  const name = (inputs[0] as HTMLInputElement)?.value || ''
                  const email = (inputs[1] as HTMLInputElement)?.value || ''
                  const password = (inputs[2] as HTMLInputElement)?.value || ''
                  handleRegister(email, password, name)
                }}
                style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 16, cursor: 'pointer' }}
              >
                Зарегистрироваться
              </button>
              <p style={{ textAlign: 'center', color: '#666' }}>
                Есть аккаунт?{' '}
                <button onClick={() => { setShowAuth('login'); setError('') }} style={{ color: '#fff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
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
            onClick={() => { setShowAuth('login'); setError('') }}
            style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', borderRadius: 8, border: 'none', fontSize: 16, padding: 16, cursor: 'pointer' }}
          >
            Вход
          </button>
          <button
            onClick={() => { setShowAuth('register'); setError('') }}
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
                {selectedChat.recipient.id === 'favorites' ? (
                  <p style={{ fontSize: 14, color: '#666' }}>Ваши заметки</p>
                ) : (
                  <p style={{ fontSize: 14, color: '#666' }}>ID: {selectedChat.recipient.searchId}</p>
                )}
              </div>
            </div>
            
            {selectedChat.messages && selectedChat.messages.map(m => {
              if (m.content === 'Удалено' || (m.deletedFor && m.deletedFor.includes(user.id))) return null
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
                <p>{selectedChat.recipient.id === 'favorites' ? 'Начните записывать заметки...' : 'Начните диалог...'}</p>
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
                  {u.id === 'favorites' ? (
                    <p style={{ fontSize: 14, color: '#666' }}>Ваши заметки</p>
                  ) : (
                    <p style={{ fontSize: 14, color: '#666' }}>ID: {u.searchId}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'chats' ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => setSearchQuery('0000')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#111', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff' }}
              >
                <Star style={{ width: 20, height: 20 }} />
                <span>Избранное</span>
              </button>
            </div>
            
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
                <Search style={{ width: 20, height: 20 }}
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
          <SettingsPage user={user} setUser={setUser} onLogout={handleLogout} />
        )}
      </main>

      {selectedChat && (
        <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, padding: 16, backgroundColor: '#000', borderTop: '1px solid #222' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder={`${selectedChat.recipient.id === 'favorites' ? 'Напишите заметку...' : 'Сообщение...'}`}
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

  const handleSave = async () => {
    try {
      await firestore.updateUser(user.id, formData)
      setUser(formData)
      setEditing(false)
      alert('Сохранено!')
    } catch (e) {
      console.error('Save error:', e)
      alert('Ошибка сохранения')
    }
  }

  if (editing) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <img src={user.avatar} style={{ width: 80, height: 80, borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 'bold' }}>{user.name}</h2>
            <p style={{ color: '#666' }}>ID: {user.searchId}</p>
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
          <p style={{ color: '#666' }}>ID: {user.searchId}</p>
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

function SettingsPage({ user, setUser, onLogout }: { user: User, setUser: (u: User) => void, onLogout: () => void }) {
  const handleToggle = async (key: keyof User) => {
    const updated = { ...user, [key]: !user[key] }
    try {
      await firestore.updateUser(user.id, updated)
      setUser(updated)
    } catch (e) {
      console.error('Update settings error:', e)
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
        onClick={onLogout}
        style={{ width: '100%', padding: 16, backgroundColor: '#cc0000', color: '#fff', fontWeight: 'bold', borderRadius: 8, border: 'none', cursor: 'pointer' }}
      >
        Выйти из аккаунта
      </button>
    </div>
  )
}
