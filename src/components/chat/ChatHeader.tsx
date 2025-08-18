// src/components/chat/ChatHeader.tsx
//聊天区域头部：显示会话名，当前用户，操作按钮（清空消息）
import { useChatStore } from '../../store/useChatStore'

export default function ChatHeader({ title = '公共聊天室' }: { title?: string }) {
  const user = useChatStore((s) => s.user)
  const clearMessages = useChatStore((s) => s.clearMessages)

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <span style={{ fontSize: 12, color: '#6b7280' }}>你是：{user || '未登录'}</span>
      </div>
      <button
        onClick={clearMessages}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        清空消息
      </button>
    </div>
  )
}
