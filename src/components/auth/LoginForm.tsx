// src/components/auth/LoginForm.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useChatStore } from "../../store/useChatStore"

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const login = useChatStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    login(username.trim())
    navigate("/chat")
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 20,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, textAlign: "center" }}>登录聊天室</h2>
        <input
          placeholder="请输入你的昵称"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: 0,
            background: "#4f46e5",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          进入
        </button>
      </form>
    </div>
  )
}
