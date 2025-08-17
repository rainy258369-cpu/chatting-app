// src/store/useChatStore.ts
//zustand全局状态管理，在这定义全局数据类型数据等，存储管理状态
import { create } from "zustand"

export type Message = {
  id: number
  user: string
  text: string
  ts: number
}

type ChatState = {
  isAuthenticated: boolean
  user: string | null
  messages: Message[]
  login: (username: string) => void
  logout: () => void
  send: (text: string) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  messages: [
    { id: 1, user: "system", text: "欢迎来到聊天室 👋", ts: Date.now() },
  ],

  login: (username) => set({ isAuthenticated: true, user: username }),
  logout: () => set({ isAuthenticated: false, user: null, messages: [] }),

  send: (text) => {
    const { user, messages } = get()
    if (!user || !text.trim()) return
    set({
      messages: [
        ...messages,
        { id: Date.now(), user, text: text.trim(), ts: Date.now() },
      ],
    })
  },

  clearMessages: () => set({ messages: [] }),
}))
