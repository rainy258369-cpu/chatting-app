import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import LoginForm from './components/auth/LoginForm'
import ChatPage from './pages/ChatPage'
import { useChatStore } from './store/useChatStore'
import type { ReactNode } from 'react' //类型

// 简单守卫：未登录重定向到 /login
function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useChatStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/login" element={<LoginForm />} />
            <Route
              path="/chat"
              element={
                <RequireAuth>
                  <ChatPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<div className="p-6 text-gray-500">404 Not Found</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
