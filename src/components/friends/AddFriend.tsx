import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Alert,
} from '@mui/material'
import { Person, Search, PersonAdd } from '@mui/icons-material'
import { useChatStore } from '../../store/useChatStore'
import { apiSearchUsers } from '../../services/api'
import type { User } from '../../types'

export default function AddFriend() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const currentUser = useChatStore((s) => s.currentUser)
  const friends = useChatStore((s) => s.friends)
  const addFriend = useChatStore((s) => s.addFriend)
  const isConnected = useChatStore((s) => s.isConnected)

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    setMessage(null)

    try {
      const results: User[] = await apiSearchUsers(searchTerm, currentUser?.id)
      const filtered = results.filter(
        (user: User) => !friends.some((friend) => friend.id === user.id),
      )
      setSearchResults(filtered)
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: '搜索失败，请重试' })
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddFriend = (userId: string) => {
    if (!isConnected) {
      setMessage({ type: 'error', text: '网络连接断开，无法发送好友请求' })
      return
    }

    addFriend(userId)
    setMessage({ type: 'success', text: '好友请求已发送' })

    // 从搜索结果中移除
    setSearchResults((prev) => prev.filter((user) => user.id !== userId))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        添加好友
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="输入用户名搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}//怎么回事
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!searchTerm.trim() || isSearching}
          >
            {isSearching ? '搜索中...' : '搜索'}
          </Button>
        </Box>
      </Box>

      {searchResults.length > 0 && (
        <List>
          {searchResults.map((user) => (
            <ListItem
              key={user.id}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemAvatar>
                <Avatar src={user.avatar}>
                  <Person />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.username}
                secondary={
                  <Chip
                    label={user.status === 'online' ? '在线' : '离线'}
                    color={user.status === 'online' ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                }
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<PersonAdd />}
                onClick={() => handleAddFriend(user.id)}
                disabled={!isConnected}
              >
                添加
              </Button>
            </ListItem>
          ))}
        </List>
      )}

      {searchTerm && searchResults.length === 0 && !isSearching && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography color="text.secondary">没有找到匹配的用户</Typography>
        </Box>
      )}
    </Paper>
  )
}
