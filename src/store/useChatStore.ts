// src/store/useChatStore.ts
//zustand全局状态管理，在这定义全局数据类型数据等，存储管理状态
import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { User, Message, ChatSession, FriendRequest } from '../types'
import { apiLogin } from '../services/api'

interface ChatState {
  // 用户状态
  currentUser: User | null
  isAuthenticated: boolean

  // 好友系统
  friends: User[]
  friendRequests: FriendRequest[]

  // 聊天系统
  chatSessions: ChatSession[]
  currentChatId: string | null
  messages: Record<string, Message[]>

  // WebSocket
  socket: Socket | null
  isConnected: boolean

  // 操作函数
  login: (username: string, avatar?: string) => Promise<void>
  logout: () => void
  updateAvatar: (avatar: string) => void

  // 好友操作
  addFriend: (friendId: string) => void
  removeFriend: (friendId: string) => void
  acceptFriendRequest: (requestId: string) => void
  rejectFriendRequest: (requestId: string) => void

  // 聊天操作
  sendMessage: (content: string, receiverId: string) => void
  setCurrentChat: (chatId: string) => void
  markMessageAsRead: (messageId: string) => void

  // WebSocket操作
  connectSocket: () => void
  disconnectSocket: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 初始状态
  currentUser: null,
  isAuthenticated: false,
  friends: [],
  friendRequests: [],
  chatSessions: [],
  currentChatId: null,
  messages: {},
  socket: null,
  isConnected: false,

  // 用户认证
  login: async (username: string, avatar?: string) => {
    const res = await apiLogin(username, avatar)
    const user: User = {
      id: res.id,
      username: res.username,
      avatar: res.avatar,
      status: 'online',
    }
    set({ currentUser: user, isAuthenticated: true })
    get().connectSocket()
  },

  logout: () => {
    get().disconnectSocket()
    set({
      currentUser: null,
      isAuthenticated: false,
      friends: [],
      friendRequests: [],
      chatSessions: [],
      currentChatId: null,
      messages: {},
    })
  },

  updateAvatar: (avatar: string) => {
    const { currentUser } = get()
    if (currentUser) {
      const updatedUser = { ...currentUser, avatar }
      set({ currentUser: updatedUser })
    }
  },

  // 好友操作
  addFriend: (friendId: string) => {
    const { socket, currentUser } = get()
    if (socket && currentUser) {
      socket.emit('friend:request', { friendId, fromUserId: currentUser.id })
    }
  },

  removeFriend: (friendId: string) => {
    set((state) => ({
      friends: state.friends.filter((friend) => friend.id !== friendId),
      chatSessions: state.chatSessions.filter(
        (session) => !session.participants.some((p) => p.id === friendId),
      ),
    }))
  },

  acceptFriendRequest: (requestId: string) => {
    const { socket } = get()
    if (socket) {
      socket.emit('friend:response', { requestId, status: 'accepted' })
    }
  },

  rejectFriendRequest: (requestId: string) => {
    const { socket } = get()
    if (socket) {
      socket.emit('friend:response', { requestId, status: 'rejected' })
    }
  },

  // 聊天操作
  sendMessage: (content: string, receiverId: string) => {
    const { currentUser, socket } = get()
    if (!currentUser || !socket) return

    const message: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      content,
      type: 'text',
      timestamp: new Date(),
      isRead: false,
    }

    // 添加到本地消息列表
    set((state) => ({
      messages: {
        ...state.messages,
        [receiverId]: [...(state.messages[receiverId] || []), message],
      },
    }))

    // 发送到服务器
    socket.emit('message:send', message)
  },

  setCurrentChat: (chatId: string) => {
    set({ currentChatId: chatId })
  },

  markMessageAsRead: (messageId: string) => {
    set((state) => ({
      messages: Object.keys(state.messages).reduce(
        (acc, chatId) => {
          acc[chatId] = state.messages[chatId].map((msg) =>
            msg.id === messageId ? { ...msg, isRead: true } : msg,
          )
          return acc
        },
        {} as Record<string, Message[]>,
      ),
    }))
  },

  // WebSocket操作
  connectSocket: () => {
    const { currentUser } = get()
    if (!currentUser) return

    const socket = io('http://localhost:3001', {
      auth: {
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
      },
    })

    socket.on('connect', () => {
      set({ isConnected: true })
      console.log('Connected to server')
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
      console.log('Disconnected from server')
    })

    socket.on('message:receive', (message: Message) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [message.senderId]: [...(state.messages[message.senderId] || []), message],
        },
      }))
    })

    socket.on('friend:request', (request: FriendRequest) => {
      set((state) => ({
        friendRequests: [...state.friendRequests, request],
      }))
    })

    socket.on('friend:response', (request: FriendRequest) => {
      if (request.status === 'accepted') {
        set((state) => {
          const friend =
            state.currentUser?.id === request.fromUser.id ? request.toUser : request.fromUser
          const alreadyHas = state.friends.some((f) => f.id === friend.id)
          return {
            friends: alreadyHas ? state.friends : [...state.friends, friend],
            friendRequests: state.friendRequests.filter((req) => req.id !== request.id),
          }
        })
      } else {
        set((state) => ({
          friendRequests: state.friendRequests.filter((req) => req.id !== request.id),
        }))
      }
    })

    set({ socket })
  },

  disconnectSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },
}))
