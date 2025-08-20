## 聊天应用（React + Node + SQLite）

一个支持添加好友与实时聊天的全栈示例项目。后端使用 SQLite 持久化用户、好友关系、好友请求与消息数据；前端在登录与打开会话时自动加载历史数据，重启服务后数据不会丢失。

### 在线体验（本地开发）
- 前端：默认 `http://localhost:5173`
- 后端：默认 `http://localhost:3001`

如需修改前端 API 地址，可在根目录创建 `.env`：
```bash
VITE_API_BASE_URL=http://localhost:3001
```

## 技术栈

- 前端：
  - React+TypeScript+Vite
  - UI：MUI（部分区域使用 Tailwind 工具类）
  - 状态管理：Zustand
  - 路由：react-router-dom
  - 实时通信：socket.io-client

- 后端：
  - Node.js（Express 4）
  - 实时通信：Socket.IO
  - 数据库：SQLite（better-sqlite3，WAL 模式）

## 功能与业务流程

- 登录（无密码，输入用户名即可）：
  - 现在为“昵称+密码”的登陆即注册：调用 `POST /api/login`，若用户不存在则创建（密码使用 bcrypt 加密存储），若存在则校验密码。
  - 兼容老用户：历史无密码用户首次使用密码登录时即为其设置密码。
  - 前端使用 Socket.IO 携带 `userId/username/avatar` 进行握手，服务端维护在线用户表 `onlineUsers`，并向其他客户端广播上线与下线事件。

- 搜索与添加好友：
  - 搜索调用 `GET /api/users/search`，支持关键字与排除当前用户。
  - 添加好友通过 Socket 事件 `friend:request` 发起，服务端持久化到表 `friend_requests` 并实时推送给被请求方。
  - 被请求方通过 `friend:response` 接受或拒绝；接受后服务端在 `friends` 表建立双向关系，并将结果实时推送给双方。
  - 登录后，前端会调用 `GET /api/friends/:userId`、`GET /api/friend-requests/:userId` 预载好友列表与待处理请求。

- 私聊消息：
  - 发送消息通过 Socket 事件 `message:send`，服务端无论对方是否在线都会写入表 `messages`，若对方在线则实时下发 `message:receive`。
  - 打开与某个好友的聊天窗口时，前端调用 `GET /api/conversations/:userIdA/:userIdB` 拉取完整历史，和实时消息按 `id` 去重合并并展示。

- 在线状态：
  - 服务端用内存 `onlineUsers` 维护在线态；REST 返回的用户/好友会动态标注 `online/offline`。

## 目录结构

```text
chatting/
  server/
    index.js           # Express + Socket.IO，REST 与实时事件
    db.js              # better-sqlite3 封装，建表与数据访问
    data/chatting.db   # SQLite 数据文件（WAL）
  src/
    store/useChatStore.ts           # 全局状态、Socket 事件、数据加载
    services/api.ts                 # REST API 封装
    components/friends/*.tsx        # 好友列表与添加
    components/chat/*.tsx           # 聊天窗口与消息展示
    pages/LoginPage.tsx, ChatPage.tsx
```

## 接口与事件速览

- REST（部分）：
  - `POST /api/login`：登录/创建用户
  - `GET /api/users/search?query=&excludeId=`：搜索用户
  - `GET /api/friends/:userId`：获取好友列表
  - `GET /api/friend-requests/:userId`：获取待处理好友请求
  - `GET /api/conversations/:userIdA/:userIdB`：获取会话历史
  - `GET /api/messages/:userId`：获取用户收件箱（离线消息场景）

- Socket 事件：
  - `message:send` / `message:receive`
  - `friend:request` / `friend:response`
  - `user:typing`
  - `user:connect` / `user:disconnect`

## 启动与开发

1) 启动后端
```bash
cd server
npm i
npm run dev
```

2) 启动前端
```bash
cd ..        # 回到项目根目录
npm i
npm run dev
```

3) 开发小贴士
- 服务器 CORS 允许来源为 `http://localhost:5173`，如端口变化需同步调整 `server/index.js` 的 CORS 配置。
- SQLite 数据位于 `server/data/chatting.db`，启用 WAL，适合开发环境并发写入。

## 数据持久化设计

- 表结构（精简说明）：
  - `users(id, username UNIQUE, avatar)`
  - `messages(id, senderId, receiverId, content, type, timestamp, isRead)`
  - `friend_requests(id, fromUserId, toUserId, status, timestamp)`
  - `friends(userId, friendId) PK(userId, friendId)`（双向各一行）

- 关键 DAO（`server/db.js`）：
  - 用户：`upsertUser`、`getUserById`、`searchUsers`
  - 消息：`saveMessage`、`getMessagesForConversation(a,b)`
  - 好友：`addBidirectionalFriendship`、`getFriendsForUser`
  - 请求：`saveFriendRequest`、`updateFriendRequestStatus`、`getPendingFriendRequestsForUser`、`getFriendRequestByIdWithUsers`

## 关键实现要点

- 消息与好友请求“写库优先”：
  - 收到 `message:send` 时即写入 SQLite，再根据在线态可选推送给对端。
  - 好友请求写库后通知目标；响应时若为 `accepted`，写入 `friends` 双向关系，再通知双方。

- 前端“首屏即有数据、按需拉取”：
  - 登录成功后：并行拉取好友列表与待处理请求。
  - 进入会话时：拉取历史消息，并与实时消息按 `id` 去重合并，避免重复展示。


## 项目亮点

- **组件化开发思维**  
  前端采用 React 组件化设计，所有页面和功能均拆分为独立的可复用组件（如好友列表、聊天窗口、消息列表、添加好友、登录表单等），便于维护和扩展。

- **模块化结构清晰**  
  项目目录结构分层明确：  
  - `components/` 目录下细分为 `auth/`（认证）、`chat/`（聊天）、`friends/`（好友）等子模块，每个模块职责单一。  
  - `store/` 统一管理全局状态和业务逻辑，`services/` 负责 API 通信，`pages/` 负责页面组织。

- **独立封装核心组件**  
  例如：  
  - `ChatHeader` 聊天头部组件  
  - `MessageList` 消息列表组件  
  - `FriendList` 好友列表组件  
  - `AddFriend` 添加好友组件  
  - `LoginForm` 登录表单组件  
  这些组件均可独立复用，且易于单元测试和样式定制。

- **代码规范化**  
  项目集成了 Prettier 和 ESLint，自动格式化和静态检查代码风格，保证团队协作时代码风格统一、可读性强、易于维护。

- **现代前端技术栈**  
  - 使用 Vite 提升开发体验和构建速度  
  - 状态管理采用轻量高效的 Zustand  
  - UI 采用 MUI 组件库，结合 Tailwind CSS 工具类灵活定制样式  
  - 路由采用 react-router-dom，页面切换流畅

- **高内聚低耦合**  
  业务逻辑与 UI 展示分离，API 通信、状态管理、组件渲染各司其职，便于后续功能扩展和维护。

- **工程化与开发体验**  
  - 支持一键启动前后端，开发环境配置简单  
  - 支持热更新和模块热替换  
  - 代码自动格式化与保存时校验，减少低级错误

- **数据持久化与实时通信**  
  - 后端采用 SQLite WAL 模式，数据安全可靠  
  - 实时通信基于 Socket.IO，消息与好友请求均支持实时推送

---

这些亮点让项目具备良好的可维护性、可扩展性和团队协作基础，适合学习和二次开发

---

如需进一步的业务扩展或工程化优化，欢迎基于当前架构继续演进。🙂
