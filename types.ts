export type User = {
  id: string
  email: string
  name: string
  password?: string
  avatar: string
  bio: string
  birthdate: string
  isOnline: boolean
  lastSeen: string
  hideBirthdate: boolean
}

export type Message = {
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

export type Chat = {
  id: string
  recipient: User
  messages: Message[] | null
}
