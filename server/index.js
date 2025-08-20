const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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

// 在线用户（仅内存保存）
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 使用握手认证信息标记在线用户
  (async () => {
    const auth = socket.handshake && socket.handshake.auth ? socket.handshake.auth : {};
    const authUserId = auth.userId;
    const authUsername = auth.username;
    if (authUserId && authUsername) {
      const existing = await db.getUserById(authUserId);
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
  })();

  // 兼容旧的事件方式登录
  socket.on('user:login', async (userData) => {
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
  socket.on('message:send', async (message) => {
    const sender = onlineUsers.get(message.senderId);
    const receiver = onlineUsers.get(message.receiverId);

    try {
      await db.saveMessage(message);
    } catch (e) {
      console.error('saveMessage error', e);
    }

    if (receiver) {
      io.to(receiver.socketId).emit('message:receive', message);
    }
    if (sender) socket.emit('message:sent', message);
  });

  // 好友请求（持久化）
  socket.on('friend:request', async (data) => {
    const inferredFrom = data.fromUserId || socket.userId;
    if (!inferredFrom || !data.friendId) return;

    const fromUser = await db.getUserById(inferredFrom);
    const toUser = await db.getUserById(data.friendId);
    if (!fromUser || !toUser) return;

    const request = {
      id: `req_${Date.now()}`,
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      status: 'pending',
      timestamp: Date.now(),
    };
    try {
      await db.saveFriendRequest(request);
    } catch (e) {
      console.error('saveFriendRequest error', e);
    }

    const requestPayload = {
      id: request.id,
      fromUser: { ...fromUser, status: onlineUsers.has(fromUser.id) ? 'online' : 'offline' },
      toUser: { ...toUser, status: onlineUsers.has(toUser.id) ? 'online' : 'offline' },
      status: request.status,
      timestamp: new Date(request.timestamp),
    };

    const toUserOnline = onlineUsers.get(data.friendId);
    if (toUserOnline) {
      io.to(toUserOnline.socketId).emit('friend:request', requestPayload);
    }
  });

  // 好友请求响应
  socket.on('friend:response', async (data) => {
    const { requestId, status } = data || {};
    if (!requestId || !status) return;
    try {
      await db.updateFriendRequestStatus(requestId, status);
    } catch (e) {
      console.error('updateFriendRequestStatus error', e);
    }

    try {
      const req = await db.getFriendRequestByIdWithUsers(requestId);
      if (!req) return;
      const fromUserOnline = onlineUsers.get(req.fromUser.id);
      const toUserOnline = onlineUsers.get(req.toUser.id);

      if (status === 'accepted') {
        try {
          await db.addBidirectionalFriendship(req.fromUser.id, req.toUser.id);
        } catch (e) {
          console.error('addFriendship error', e);
        }
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

        socket.broadcast.emit('user:disconnect', socket.userId);
        console.log('User disconnected:', user.username);
      }
    }
  });
});

// ------------------- API 路由 -------------------

// 登录/注册
app.post('/api/login', async (req, res) => {
  const { username, password, avatar } = req.body || {};
  if (!username || !String(username).trim()) {
    return res.status(400).json({ message: '用户名必填' });
  }
  if (!password || !String(password).trim()) {
    return res.status(400).json({ message: '密码必填' });
  }
  const trimmed = String(username).trim();
  try {
    const user = await db.loginOrRegister(trimmed, String(password), avatar);
    console.log('[api/login] loginOrRegister', trimmed, '=>', user.id);
    const isOnline = onlineUsers.has(user.id);
    res.json({ ...user, status: isOnline ? 'online' : 'offline' });
  } catch (e) {
    res.status(401).json({ message: e.message || '用户名或密码不正确' });
  }
});

// 搜索用户
app.get('/api/users/search', async (req, res) => {
  const { query = '', excludeId } = req.query;
  const rows = await db.searchUsers(query, excludeId ? String(excludeId) : undefined);
  const filtered = rows.map(u => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    status: onlineUsers.has(u.id) ? 'online' : 'offline'
  }));
  console.log('[api/users/search]', { query, excludeId, count: filtered.length });
  res.json(filtered);
});

// 在线用户
app.get('/api/users', (req, res) => {
  const users = Array.from(onlineUsers.values()).map(user => ({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    status: user.status
  }));
  res.json(users);
});

// 调试：查看数据库所有用户
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const enriched = users.map(u => ({
      ...u,
      status: onlineUsers.has(u.id) ? 'online' : 'offline'
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ message: 'failed to read users', error: String(e) })
  }
});

// 单用户收件箱
app.get('/api/messages/:userId', async (req, res) => {
  const persisted = await db.getMessagesForUser(req.params.userId);
  res.json(persisted);
});

// 会话历史
app.get('/api/conversations/:userIdA/:userIdB', async (req, res) => {
  const { userIdA, userIdB } = req.params;
  const rows = await db.getMessagesForConversation(userIdA, userIdB);
  res.json(rows);
});

// 好友列表
app.get('/api/friends/:userId', async (req, res) => {
  const { userId } = req.params;
  const rows = await db.getFriendsForUser(userId);
  res.json(rows);
});

// ------------------- 启动 -------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
