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

// 存储在线用户
const onlineUsers = new Map();
const friendRequests = new Map();
const messages = new Map();

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

  // 发送消息
  socket.on('message:send', (message) => {
    const sender = onlineUsers.get(message.senderId);
    const receiver = onlineUsers.get(message.receiverId);
    
    if (sender && receiver) {
      // 存储消息
      if (!messages.has(message.receiverId)) {
        messages.set(message.receiverId, []);
      }
      messages.get(message.receiverId).push(message);
      try { db.saveMessage(message); } catch (e) { console.error('saveMessage error', e); }
      
      // 发送给接收者
      io.to(receiver.socketId).emit('message:receive', message);
      
      // 发送确认给发送者
      socket.emit('message:sent', message);
    }
  });

  // 好友请求
  socket.on('friend:request', (data) => {
    const inferredFrom = data.fromUserId || socket.userId;
    const fromUser = onlineUsers.get(inferredFrom);
    const toUser = onlineUsers.get(data.friendId);
    
    if (fromUser && toUser) {
      const request = {
        id: `req_${Date.now()}`,
        fromUser,
        toUser,
        status: 'pending',
        timestamp: new Date()
      };
      
      friendRequests.set(request.id, request);
      
      // 发送好友请求给目标用户
      io.to(toUser.socketId).emit('friend:request', request);
    }
  });

  // 好友请求响应
  socket.on('friend:response', (data) => {
    const request = friendRequests.get(data.requestId);
    if (request) {
      request.status = data.status;
      
      // 通知请求发送者
      const fromUser = onlineUsers.get(request.fromUser.id);
      if (fromUser) {
        io.to(fromUser.socketId).emit('friend:response', request);
      }
      
      // 通知请求接收者
      const toUser = onlineUsers.get(request.toUser.id);
      if (toUser) {
        io.to(toUser.socketId).emit('friend:response', request);
      }
      
      friendRequests.delete(data.requestId);
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
// 登录（若不存在则创建），为简单起见不设密码（持久化 SQLite）
app.post('/api/login', (req, res) => {
  const { username, avatar } = req.body || {};
  if (!username || !String(username).trim()) {
    return res.status(400).json({ message: '用户名必填' });
  }
  const trimmed = String(username).trim();
  const user = db.upsertUser(trimmed, avatar);
  console.log('[api/login] upsert', trimmed, '=>', user.id);
  const isOnline = onlineUsers.has(user.id);
  res.json({ ...user, status: isOnline ? 'online' : 'offline' });
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

app.get('/api/messages/:userId', (req, res) => {
  const persisted = db.getMessagesForUser(req.params.userId);
  const inMemory = messages.get(req.params.userId) || [];
  res.json([...persisted, ...inMemory]);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
