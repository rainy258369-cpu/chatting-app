const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dataDir = path.join(__dirname, 'data')
const dbFile = path.join(dataDir, 'chatting.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbFile)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    avatar TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    isRead INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    fromUserId TEXT NOT NULL,
    toUserId TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friends (
    userId TEXT NOT NULL,
    friendId TEXT NOT NULL,
    PRIMARY KEY (userId, friendId)
  );
`)

function getUserById(id) {
  const stmt = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?')
  return stmt.get(id) || null
}

function getUserByUsername(username) {
  const stmt = db.prepare('SELECT id, username, avatar FROM users WHERE username = ? COLLATE NOCASE')
  return stmt.get(username) || null
}

function createUser(id, username, avatar) {
  const stmt = db.prepare('INSERT INTO users (id, username, avatar) VALUES (?, ?, ?)')
  stmt.run(id, username, avatar || '')
  return { id, username, avatar: avatar || '' }
}

function upsertUser(username, avatar) {
  const existing = getUserByUsername(username)
  if (!existing) {
    const id = `user_${Date.now()}`
    return createUser(id, username, avatar)
  }
  if (avatar && avatar !== existing.avatar) {
    const upd = db.prepare('UPDATE users SET avatar = ? WHERE id = ?')
    upd.run(avatar, existing.id)
    return { ...existing, avatar }
  }
  return existing
}

function searchUsers(query, excludeId) {
  const like = `%${String(query || '').trim()}%`
  if (String(query || '').trim()) {
    const stmt = db.prepare(
      'SELECT id, username, avatar FROM users WHERE username LIKE ? COLLATE NOCASE AND (? IS NULL OR id <> ?)' ,
    )
    return stmt.all(like, excludeId || null, excludeId || null)
  } else {
    const stmt = db.prepare('SELECT id, username, avatar FROM users WHERE (? IS NULL OR id <> ?)')
    return stmt.all(excludeId || null, excludeId || null)
  }
}

function saveMessage(message) {
  const stmt = db.prepare(
    'INSERT INTO messages (id, senderId, receiverId, content, type, timestamp, isRead) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  const ts = typeof message.timestamp === 'number' ? message.timestamp : new Date(message.timestamp).getTime()
  stmt.run(
    message.id,
    message.senderId,
    message.receiverId,
    message.content,
    message.type,
    ts,
    message.isRead ? 1 : 0,
  )
}

function getMessagesForUser(userId) {
  const stmt = db.prepare(
    'SELECT id, senderId, receiverId, content, type, timestamp, isRead FROM messages WHERE receiverId = ? ORDER BY timestamp ASC',
  )
  const rows = stmt.all(userId)
  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    content: r.content,
    type: r.type,
    timestamp: new Date(r.timestamp),
    isRead: !!r.isRead,
  }))
}

function getMessagesForConversation(userIdA, userIdB) {
  const stmt = db.prepare(
    `SELECT id, senderId, receiverId, content, type, timestamp, isRead
     FROM messages
     WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
     ORDER BY timestamp ASC`
  )
  const rows = stmt.all(userIdA, userIdB, userIdB, userIdA)
  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    content: r.content,
    type: r.type,
    timestamp: new Date(r.timestamp),
    isRead: !!r.isRead,
  }))
}

function saveFriendRequest(request) {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO friend_requests (id, fromUserId, toUserId, status, timestamp) VALUES (?, ?, ?, ?, ?)',
  )
  const ts = typeof request.timestamp === 'number' ? request.timestamp : new Date(request.timestamp).getTime()
  stmt.run(request.id, request.fromUserId, request.toUserId, request.status, ts)
}

function updateFriendRequestStatus(id, status) {
  const stmt = db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?')
  stmt.run(status, id)
}

function addFriendship(userId, friendId) {
  const stmt = db.prepare('INSERT OR IGNORE INTO friends (userId, friendId) VALUES (?, ?)')
  stmt.run(userId, friendId)
}

function addBidirectionalFriendship(userId, friendId) {
  const insert = db.prepare('INSERT OR IGNORE INTO friends (userId, friendId) VALUES (?, ?)')
  const tx = db.transaction((a, b) => {
    insert.run(a, b)
    insert.run(b, a)
  })
  tx(userId, friendId)
}

function getFriendsForUser(userId) {
  const stmt = db.prepare(
    `SELECT u.id, u.username, u.avatar
     FROM friends f
     JOIN users u ON u.id = f.friendId
     WHERE f.userId = ?`
  )
  return stmt.all(userId)
}

function getPendingFriendRequestsForUser(userId) {
  const stmt = db.prepare(
    `SELECT fr.id, fr.fromUserId, fr.toUserId, fr.status, fr.timestamp,
            fu.username AS fromUsername, fu.avatar AS fromAvatar,
            tu.username AS toUsername, tu.avatar AS toAvatar
     FROM friend_requests fr
     JOIN users fu ON fu.id = fr.fromUserId
     JOIN users tu ON tu.id = fr.toUserId
     WHERE fr.toUserId = ? AND fr.status = 'pending'
     ORDER BY fr.timestamp DESC`
  )
  return stmt.all(userId).map((r) => ({
    id: r.id,
    fromUser: { id: r.fromUserId, username: r.fromUsername, avatar: r.fromAvatar },
    toUser: { id: r.toUserId, username: r.toUsername, avatar: r.toAvatar },
    status: r.status,
    timestamp: new Date(r.timestamp),
  }))
}

function getFriendRequestByIdWithUsers(id) {
  const stmt = db.prepare(
    `SELECT fr.id, fr.fromUserId, fr.toUserId, fr.status, fr.timestamp,
            fu.username AS fromUsername, fu.avatar AS fromAvatar,
            tu.username AS toUsername, tu.avatar AS toAvatar
     FROM friend_requests fr
     JOIN users fu ON fu.id = fr.fromUserId
     JOIN users tu ON tu.id = fr.toUserId
     WHERE fr.id = ?`
  )
  const r = stmt.get(id)
  if (!r) return null
  return {
    id: r.id,
    fromUser: { id: r.fromUserId, username: r.fromUsername, avatar: r.fromAvatar },
    toUser: { id: r.toUserId, username: r.toUsername, avatar: r.toAvatar },
    status: r.status,
    timestamp: new Date(r.timestamp),
  }
}

module.exports = {
  getUserById,
  getUserByUsername,
  upsertUser,
  searchUsers,
  saveMessage,
  getMessagesForUser,
  getMessagesForConversation,
  saveFriendRequest,
  updateFriendRequestStatus,
  addFriendship,
  addBidirectionalFriendship,
  getFriendsForUser,
  getPendingFriendRequestsForUser,
  getFriendRequestByIdWithUsers,
  getAllUsers: () => db.prepare('SELECT id, username, avatar FROM users').all(),
}


