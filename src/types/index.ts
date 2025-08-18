export interface User {
  id: string
  username: string
  avatar?: string
  status: 'online' | 'offline'
  lastSeen?: Date
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  type: 'text' | 'image' | 'file'
  timestamp: Date
  isRead: boolean
}

export interface ChatSession {
  id: string
  participants: User[]
  lastMessage?: Message
  unreadCount: number
}

export interface FriendRequest {
  id: string
  fromUser: User
  toUser: User
  status: 'pending' | 'accepted' | 'rejected'
  timestamp: Date
}

export interface SocketEvents {
  'user:connect': (user: User) => void
  'user:disconnect': (userId: string) => void
  'message:send': (message: Message) => void
  'message:receive': (message: Message) => void
  'friend:request': (request: FriendRequest) => void
  'friend:response': (request: FriendRequest) => void
  'user:typing': (data: { userId: string; chatId: string; isTyping: boolean }) => void
}
