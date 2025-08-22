import { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Typography,
  Badge,
  IconButton,
  Chip,
  Divider,
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
            <List dense>
              {friendRequests.map((request) => (
                <ListItem key={request.id} sx={{ bgcolor: 'grey.50', mb: 1, borderRadius: 1 }}>
                  <ListItemAvatar>
                    <Avatar src={request.fromUser.avatar}>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={request.fromUser.username} secondary="想添加您为好友" />
                  <ListItemSecondaryAction>
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
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* 好友列表 */}
        <List>
          {filteredFriends.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                {searchTerm ? '没有找到匹配的好友' : '暂无好友'}
              </Typography>
            </Box>
          ) : (
            filteredFriends.map((friend) => (
              <ListItem
                key={friend.id}
                onClick={() => onSelectFriend(friend)}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Circle
                        sx={{
                          color: friend.status === 'online' ? 'success.main' : 'grey.400',
                          fontSize: 12,
                        }}
                      />
                    }
                  >
                    <Avatar src={friend.avatar}>
                      <Person />
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={friend.username}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={friend.status === 'online' ? '在线' : '离线'}
                        size="small"
                        color={friend.status === 'online' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Box>
  )
}
