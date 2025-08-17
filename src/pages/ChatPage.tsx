import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import ChatHeader from "../components/chat/ChatHeader"
import MessageList from "../components/chat/MessageList"
import MessageInput from "../components/chat/MessageInput"
import { useChatStore } from "../store/useChatStore"

export default function ChatPage() {
  const isAuthenticated = useChatStore((s) => s.isAuthenticated)
  const send = useChatStore((s) => s.send)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true })
  }, [isAuthenticated, navigate])

  return (
    <div
      style={{
        maxWidth: 920,
        height: "calc(100vh - 56px)",
        margin: "0 auto",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <ChatHeader />
      <MessageList />
      <div style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}>
        <MessageInput onSend={send} />
      </div>
    </div>
  )
}

