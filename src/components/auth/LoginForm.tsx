// src/components/auth/LoginForm.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material'
import { useChatStore } from '../../store/useChatStore'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useChatStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password.trim()) {
      setError('请输入密码')
      return
    }
    setError('')
    try {
      await login(username, password)
      navigate('/chat', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败，请重试'
      setError(message)
    }
  }

  return (
    <Box className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-gradient-to-br from-indigo-500 to-purple-600 px-4">
      <Paper elevation={8} className="w-full max-w-sm text-center p-6 md:p-8">
        <Typography variant="h4" component="h1" gutterBottom>
          欢迎来到聊天室
        </Typography>

        <Box component="form" onSubmit={handleSubmit} className="mt-1">
          {error && (
            <Alert severity="error" className="mb-2">
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="mb-2"
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-2"
          />

          <Button type="submit" fullWidth variant="contained" size="large" className="mt-3 mb-2">
            开始聊天
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
