import React, { useState, useEffect, useRef } from 'react'
import { Box, Paper, Typography, TextField, IconButton, Avatar, Chip} from '@mui/material'
import { Send, Person } from '@mui/icons-material'
import { useChatStore } from '../../store/useChatStore'
import type { User} from '../../types'

interface ChatWindowProps {
  friend: User
}

const ChatWindow: React.FC<ChatWindowProps> = ({ friend }) => {
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentUser = useChatStore((s) => s.currentUser)
  const messages = useChatStore((s) => s.messages)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const isConnected = useChatStore((s) => s.isConnected)

  const chatMessages = messages[friend.id] || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // 首次打开该好友会话时从后端加载历史消息
  useEffect(() => {
    const load = async () => {
      try {
        await useChatStore.getState().loadConversation(friend.id)
      } catch (e) {
        // 忽略错误显示，控制台打印即可
        console.warn('加载历史消息失败', e)
      }
    }
    load()
    // 仅在 friend.id 变化时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend.id])

  const handleSend = () => {
    if (!messageText.trim() || !isConnected) return

    sendMessage(messageText.trim(), friend.id)
    setMessageText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 聊天头部 */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar src={friend.avatar}>
          <Person />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{friend.username}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={friend.status === 'online' ? '在线' : '离线'}
              color={friend.status === 'online' ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
            {!isConnected && (
              <Chip label="连接断开" color="error" size="small" variant="outlined" />
            )}
          </Box>
        </Box>
      </Box>

      {/* 消息区域 */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {chatMessages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">开始与 {friend.username} 聊天吧！</Typography>
          </Box>
        ) : (
          chatMessages.map((message) => {
            const isOwnMessage = message.senderId === currentUser?.id

            return (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    backgroundColor: isOwnMessage ? 'primary.main' : 'white',
                    color: isOwnMessage ? 'white' : 'text.primary',
                    p: 1.5,
                    borderRadius: 2,
                    boxShadow: 1,
                    position: 'relative',
                  }}
                >
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {message.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: '0.7rem',
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </Typography>
                </Box>
              </Box>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入区域 */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid #e0e0e0',
          backgroundColor: 'white',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="输入消息..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!messageText.trim() || !isConnected}
            color="primary"
            sx={{
              alignSelf: 'flex-end',
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'grey.300',
                color: 'grey.500',
              },
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  )
}

export default ChatWindow
