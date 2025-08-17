// src/components/Header.tsx
//全局头部，显示app名称+当前用户+退出
import { useNavigate } from "react-router-dom"
import { useChatStore } from "../store/useChatStore"

export default function Header() {
  const user = useChatStore((s) => s.user)
  const logout = useChatStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header
      style={{
        height: 56,
        padding: "0 16px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#ffffffcc",
        backdropFilter: "saturate(180%) blur(6px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 700 }}>Chatting • Demo</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "#6b7280" }}>
          {user ? `已登录：${user}` : "未登录"}
        </span>
        {user && (
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            退出
          </button>
        )}
      </div>
    </header>
  )
}
