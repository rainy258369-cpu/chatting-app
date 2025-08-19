const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// 用户持久化改为 SQLite（见 ./db.js）
function findUserById(userId) {
  return db.getUserById(userId);
}

// 存储在线用户（仅在线态，好友/消息改由 SQLite 持久化）
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 使用握手认证信息标记在线用户
  const auth = socket.handshake && socket.handshake.auth ? socket.handshake.auth : {};
  const authUserId = auth.userId;
  const authUsername = auth.username;
  if (authUserId && authUsername) {
    const existing = findUserById(authUserId);
    const avatar = existing ? existing.avatar : auth.avatar;
    const user = {
      id: authUserId,
      username: authUsername,
      avatar,
      status: 'online',
      socketId: socket.id
    };
    onlineUsers.set(user.id, user);
    socket.userId = user.id;
    socket.broadcast.emit('user:connect', user);
    console.log('User logged in (handshake):', user.username);
  }

  // 兼容旧的事件方式登录（可选）
  socket.on('user:login', (userData) => {
    const user = {
      id: userData.userId,
      username: userData.username,
      avatar: userData.avatar,
      status: 'online',
      socketId: socket.id
    };
    onlineUsers.set(user.id, user);
    socket.userId = user.id;
    socket.broadcast.emit('user:connect', user);
    console.log('User logged in (event):', user.username);
  });

  // 发送消息（持久化）
  socket.on('message:send', (message) => {
    const sender = onlineUsers.get(message.senderId);
    const receiver = onlineUsers.get(message.receiverId);

    // 无论对方是否在线，都保存消息
    try { db.saveMessage(message); } catch (e) { console.error('saveMessage error', e); }

    if (receiver) {
      io.to(receiver.socketId).emit('message:receive', message);
    }
    // 发送确认给发送者（如果还在线）
    if (sender) socket.emit('message:sent', message);
  });

  // 好友请求（持久化）
  socket.on('friend:request', (data) => {
    const inferredFrom = data.fromUserId || socket.userId;
    const fromUserOnline = onlineUsers.get(inferredFrom);
    const toUserOnline = onlineUsers.get(data.friendId);
    if (!inferredFrom || !data.friendId) return;

    const fromUser = db.getUserById(inferredFrom);
    const toUser = db.getUserById(data.friendId);
    if (!fromUser || !toUser) return;

    const request = {
      id: `req_${Date.now()}`,
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      status: 'pending',
      timestamp: Date.now(),
    };
    try { db.saveFriendRequest(request); } catch (e) { console.error('saveFriendRequest error', e); }

    const requestPayload = {
      id: request.id,
      fromUser: { ...fromUser, status: onlineUsers.has(fromUser.id) ? 'online' : 'offline' },
      toUser: { ...toUser, status: onlineUsers.has(toUser.id) ? 'online' : 'offline' },
      status: request.status,
      timestamp: new Date(request.timestamp),
    };

    if (toUserOnline) {
      io.to(toUserOnline.socketId).emit('friend:request', requestPayload);
    }
  });

  // 好友请求响应（持久化 + 建立好友关系）
  socket.on('friend:response', (data) => {
    const { requestId, status } = data || {};
    if (!requestId || !status) return;
    try {
      db.updateFriendRequestStatus(requestId, status);
    } catch (e) {
      console.error('updateFriendRequestStatus error', e);
    }

    // 查询请求信息，通知两端；若接受则写入双向好友关系
    try {
      const req = db.getFriendRequestByIdWithUsers(requestId);
      if (!req) return;
      const fromUserOnline = onlineUsers.get(req.fromUser.id);
      const toUserOnline = onlineUsers.get(req.toUser.id);

      if (status === 'accepted') {
        try { db.addBidirectionalFriendship(req.fromUser.id, req.toUser.id); } catch (e) { console.error('addFriendship error', e); }
      }

      const payload = {
        ...req,
        status,
        fromUser: { ...req.fromUser, status: onlineUsers.has(req.fromUser.id) ? 'online' : 'offline' },
        toUser: { ...req.toUser, status: onlineUsers.has(req.toUser.id) ? 'online' : 'offline' },
      };
      if (fromUserOnline) io.to(fromUserOnline.socketId).emit('friend:response', payload);
      if (toUserOnline) io.to(toUserOnline.socketId).emit('friend:response', payload);
    } catch (e) {
      console.error('friend accept handle error', e);
    }
  });

  // 用户正在输入
  socket.on('user:typing', (data) => {
    const receiver = onlineUsers.get(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('user:typing', {
        userId: data.userId,
        chatId: data.chatId,
        isTyping: data.isTyping
      });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (socket.userId) {
      const user = onlineUsers.get(socket.userId);
      if (user) {
        user.status = 'offline';
        user.lastSeen = new Date();
        onlineUsers.delete(socket.userId);
        
        // 广播用户下线
        socket.broadcast.emit('user:disconnect', socket.userId);
        console.log('User disconnected:', user.username);
      }
    }
  });
});

// API路由
// 登录（登陆即注册）：需要用户名+密码；不存在则创建，存在需校验密码
app.post('/api/login', (req, res) => {
  const { username, password, avatar } = req.body || {};
  if (!username || !String(username).trim()) {
    return res.status(400).json({ message: '用户名必填' });
  }
  if (!password || !String(password).trim()) {
    return res.status(400).json({ message: '密码必填' });
  }
  const trimmed = String(username).trim();
  try {
    const user = db.loginOrRegister(trimmed, String(password), avatar);
    console.log('[api/login] loginOrRegister', trimmed, '=>', user.id);
    const isOnline = onlineUsers.has(user.id);
    res.json({ ...user, status: isOnline ? 'online' : 'offline' });
  } catch (e) {
    res.status(401).json({ message: e.message || '用户名或密码不正确' })
  }
});

// 搜索用户（从数据库中），支持 query 与 excludeId
app.get('/api/users/search', (req, res) => {
  const { query = '', excludeId } = req.query;
  const rows = db.searchUsers(query, excludeId ? String(excludeId) : undefined);
  const filtered = rows.map(u => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    status: onlineUsers.has(u.id) ? 'online' : 'offline'
  }));
  console.log('[api/users/search]', { query, excludeId, count: filtered.length });
  res.json(filtered);
});

// 在线用户（仅当前在线，兼容旧逻辑）
app.get('/api/users', (req, res) => {
  const users = Array.from(onlineUsers.values()).map(user => ({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    status: user.status
  }));
  res.json(users);
});

// 调试：查看数据库中所有用户
app.get('/api/debug/users', (req, res) => {
  try {
    const users = db.getAllUsers().map(u => ({
      ...u,
      status: onlineUsers.has(u.id) ? 'online' : 'offline'
    }));
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'failed to read users', error: String(e) })
  }
});

// 查询单用户收件箱（保留，便于离线消息拉取）
app.get('/api/messages/:userId', (req, res) => {
  const persisted = db.getMessagesForUser(req.params.userId);
  res.json(persisted);
});

// 查询双方会话历史
app.get('/api/conversations/:userIdA/:userIdB', (req, res) => {
  const { userIdA, userIdB } = req.params;
  const rows = db.getMessagesForConversation(userIdA, userIdB);
  res.json(rows);
});

// 查询好友列表
app.get('/api/friends/:userId', (req, res) => {
  const { userId } = req.params;
  const rows = db.getFriendsForUser(userId).map(u => ({
    ...u,
    status: onlineUsers.has(u.id) ? 'online' : 'offline'
  }));
  res.json(rows);
});

// 查询待处理好友请求
app.get('/api/friend-requests/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const rows = db.getPendingFriendRequestsForUser(userId);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'failed', error: String(e) })
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
