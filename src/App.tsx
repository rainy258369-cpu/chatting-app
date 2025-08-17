import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Header from "./components/Header"
import LoginForm from "./components/auth/LoginForm"
import ChatPage from "./pages/ChatPage"
import { useChatStore } from "./store/useChatStore"
import type { ReactNode } from "react";//类型


// 简单守卫：未登录重定向到 /login
function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useChatStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
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
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </BrowserRouter>
  )
}

