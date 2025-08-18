// src/components/Header.tsx
//全局头部，显示app名称+当前用户+退出
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/useChatStore'

export default function Header() {
  const currentUser = useChatStore((s) => s.currentUser)
  const logout = useChatStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 h-14 px-4 border-b bg-white/90 backdrop-blur flex items-center justify-between">
      <div className="font-bold">Chatting • Demo</div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {currentUser ? `已登录：${currentUser.username}` : '未登录'}
        </span>
        {currentUser && (
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
          >
            退出
          </button>
        )}
      </div>
    </header>
  )
}
