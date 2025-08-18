// src/components/auth/LoginForm.tsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, TextField, Button, Typography, Paper, Avatar, IconButton, Alert } from '@mui/material'
import { PhotoCamera, Person } from '@mui/icons-material'
import { useChatStore } from '../../store/useChatStore'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const login = useChatStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    setError('')
    try {
      await login(username, avatar || undefined)
      navigate('/chat', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败，请重试'
      setError(message)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatar(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Box className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-gradient-to-br from-indigo-500 to-purple-600 px-4">
      <Paper elevation={8} className="w-full max-w-sm text-center p-6 md:p-8">
        <Typography variant="h4" component="h1" gutterBottom>
          欢迎来到聊天室
        </Typography>

        <Box className="mb-4 flex justify-center">
          <Box className="relative">
            <Avatar
              src={avatar || undefined}
              sx={{ width: 80, height: 80, cursor: 'pointer', border: '3px solid #e0e0e0' }}
              onClick={handleAvatarClick}
            >
              <Person sx={{ fontSize: 40 }} />
            </Avatar>
            <IconButton
              className="absolute bottom-0 right-0 bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={handleAvatarClick}
            >
              <PhotoCamera />
            </IconButton>
          </Box>
        </Box>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />

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

          <Button type="submit" fullWidth variant="contained" size="large" className="mt-3 mb-2">
            开始聊天
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
