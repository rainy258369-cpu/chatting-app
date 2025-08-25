import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Avatar,
  Chip,
} from '@mui/material'
import { Person, Check, Close, Circle, Search } from '@mui/icons-material'
import { useChatStore } from '../../store/useChatStore'
import type { User } from '../../types'

interface FriendListProps {
  onSelectFriend: (friend: User) => void
}

export default function FriendList({ onSelectFriend }: FriendListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const friends = useChatStore((s) => s.friends)
  const friendRequests = useChatStore((s) => s.friendRequests)
  const acceptFriendRequest = useChatStore((s) => s.acceptFriendRequest)
  const rejectFriendRequest = useChatStore((s) => s.rejectFriendRequest)

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAcceptRequest = (requestId: string) => {
    acceptFriendRequest(requestId)
  }

  const handleRejectRequest = (requestId: string) => {
    rejectFriendRequest(requestId)
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          好友列表 ({friends.length})
        </Typography>

        {/* 搜索框 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Search sx={{ position: 'absolute', left: 8, top: 8, color: 'text.secondary' }} />
            <input
              type="text"
              id="friend-search"
              placeholder="搜索好友..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 8px 8px 40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </Box>
        </Box>

        {/* 好友请求 */}
        {friendRequests.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              好友请求 ({friendRequests.length})
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 1 }}>
              {friendRequests.map((request) => (
                <Box
                  key={request.id}
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Avatar src={request.fromUser.avatar} sx={{ mr: 1 }}>
                    <Person />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {request.fromUser.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      想添加您为好友
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleAcceptRequest(request.id)}
                    sx={{ mr: 1 }}
                  >
                    <Check />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRejectRequest(request.id)}
                  >
                    <Close />
                  </IconButton>
                </Box>
              ))}
            </Paper>
          </Box>
        )}

        {/* 好友列表 */}
        <Box>
          {filteredFriends.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                {searchTerm ? '没有找到匹配的好友' : '暂无好友'}
              </Typography>
            </Box>
          ) : (
            filteredFriends.map((friend) => (
              <Box
                key={friend.id}
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => onSelectFriend(friend)}
              >
                <Avatar src={friend.avatar} sx={{ mr: 2 }}>
                  <Person />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {friend.username}
                  </Typography>
                  <Chip
                    label={friend.status === 'online' ? '在线' : '离线'}
                    size="small"
                    color={friend.status === 'online' ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Circle
                  sx={{
                    color: friend.status === 'online' ? 'success.main' : 'grey.400',
                    fontSize: 12,
                  }}
                />
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  )
}
