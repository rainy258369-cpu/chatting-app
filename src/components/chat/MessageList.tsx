import { useMemo } from 'react'
import { useChatStore } from '../../store/useChatStore'

type Message = {
  id: string
  senderId: string
  receiverId: string
  content: string
  type: 'text' | 'image' | 'file'
  timestamp: Date
  isRead: boolean
}

type MessageWithMeta = Message & {
  isMe: boolean
  time: string
}

function formatTime(ts: Date | string | number) {
  const d = ts instanceof Date ? ts : new Date(ts)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString()
}

export default function MessageList() {
  // 直接把“当前会话”的消息取成数组（没有就返回空数组），这样后面一定能 .map
  const currentMessages = useChatStore((s) =>
    s.currentChatId ? (s.messages[s.currentChatId] ?? []) : ([] as Message[]),
  )
  const currentUserId = useChatStore((s) => s.currentUser?.id ?? null)

  const items = useMemo<MessageWithMeta[]>(
    () =>
      currentMessages.map((m) => ({
        ...m,
        isMe: currentUserId !== null && m.senderId === currentUserId,
        time: formatTime(m.timestamp),
      })),
    [currentMessages, currentUserId],
  )

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 12,
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {items.map((m) => (
        <div
          key={m.id}
          style={{ display: 'flex', justifyContent: m.isMe ? 'flex-end' : 'flex-start' }}
        >
          <div
            style={{
              maxWidth: '70%',
              padding: '8px 12px',
              borderRadius: 16,
              background: m.isMe ? '#4f46e5' : '#e5e7eb',
              color: m.isMe ? '#fff' : '#111827',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            title={m.time}
          >
            {!m.isMe && (
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{m.senderId}</div>
            )}
            {m.content}
          </div>
        </div>
      ))}
    </div>
  )
}
