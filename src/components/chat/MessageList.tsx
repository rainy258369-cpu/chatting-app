// src/components/chat/MessageList.tsx
import { useMemo } from "react"
import { useChatStore } from "../../store/useChatStore"

export default function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const user = useChatStore((s) => s.user)

  const items = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        isMe: m.user === user,
        time: new Date(m.ts).toLocaleTimeString(),
      })),
    [messages, user]
  )

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 12,
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {items.map((m) => (
        <div
          key={m.id}
          style={{
            display: "flex",
            justifyContent: m.isMe ? "flex-end" : "flex-start",
          }}
        >
          <div
            style={{
              maxWidth: "70%",
              padding: "8px 12px",
              borderRadius: 16,
              background: m.isMe ? "#4f46e5" : "#e5e7eb",
              color: m.isMe ? "#fff" : "#111827",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            title={m.time}
          >
            {!m.isMe && (
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                {m.user}
              </div>
            )}
            {m.text}
          </div>
        </div>
      ))}
    </div>
  )
}
