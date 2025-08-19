import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Drawer,
  IconButton,
  Badge,
  Chip,
} from '@mui/material'
import { People, Chat, Menu, Close, Circle } from '@mui/icons-material'
import { useChatStore } from '../store/useChatStore'
import FriendList from '../components/friends/FriendList'
import AddFriend from '../components/friends/AddFriend'
import ChatWindow from '../components/chat/ChatWindow'
import type { User } from '../types'

export default function ChatPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null)

  const isAuthenticated = useChatStore((s) => s.isAuthenticated)
  const currentUser = useChatStore((s) => s.currentUser)
  const friends = useChatStore((s) => s.friends)
  const friendRequests = useChatStore((s) => s.friendRequests)
  const isConnected = useChatStore((s) => s.isConnected)
  const navigate = useNavigate()

  if (!isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  const handleSelectFriend = (friend: User) => {
    setSelectedFriend(friend)
    setDrawerOpen(false)
  }

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen)
  }

  return (
    <Box className="h-[calc(100vh-56px)] flex">
      {/* 主聊天区域 */}
      <Box className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <Paper elevation={1} className="p-2 flex items-center justify-between border-b">
          <Box className="flex items-center gap-2">
            <IconButton onClick={toggleDrawer}>
              <Menu />
            </IconButton>
            <Typography variant="h6">
              {selectedFriend ? `与 ${selectedFriend.username} 聊天` : '选择好友开始聊天'}
            </Typography>
          </Box>

          <Box className="flex items-center gap-2">
            <Chip
              icon={<Circle sx={{ fontSize: 12 }} />}
              label={isConnected ? '在线' : '离线'}
              color={isConnected ? 'success' : 'default'}
              size="small"
            />
            {friendRequests.length > 0 && (
              <Badge badgeContent={friendRequests.length} color="error">
                <IconButton onClick={toggleDrawer}>
                  <People />
                </IconButton>
              </Badge>
            )}
          </Box>
        </Paper>

        {/* 聊天窗口 */}
        <Box className="flex-1 p-2">
          {selectedFriend ? (
            <ChatWindow friend={selectedFriend} />
          ) : (
            <Box className="h-full flex flex-col items-center justify-center text-gray-500">
              <Chat sx={{ fontSize: 64, marginBottom: 8, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                欢迎来到聊天室
              </Typography>
              <Typography variant="body2">从左侧好友列表中选择一个好友开始聊天</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* 好友列表抽屉 */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer} sx={{ '& .MuiDrawer-paper': { width: 320, boxSizing: 'border-box' } }}>
        <Box className="p-2 border-b">
          <Box className="flex items-center justify-between">
            <Typography variant="h6">好友列表</Typography>
            <IconButton onClick={toggleDrawer}>
              <Close />
            </IconButton>
          </Box>
        </Box>
        <Box className="p-2">
          <AddFriend />
        </Box>
        <FriendList onSelectFriend={handleSelectFriend} />
      </Drawer>
    </Box>
  )
}
