// db.js - PostgreSQL 版本
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Render 需要加上这句
});

module.exports = pool;
// 初始化表
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      avatar TEXT DEFAULT '',
      password TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      senderId TEXT NOT NULL,
      receiverId TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      isRead BOOLEAN DEFAULT FALSE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      userId TEXT NOT NULL,
      friendId TEXT NOT NULL,
      PRIMARY KEY (userId, friendId)
    );
  `);
}
init().catch(console.error);

// 用户操作
async function getUserById(id) {
  const res = await pool.query(
    'SELECT id, username, avatar FROM users WHERE id=$1',
    [id]
  );
  return res.rows[0] || null;
}

async function getUserByUsername(username) {
  const res = await pool.query(
    'SELECT id, username, avatar FROM users WHERE username ILIKE $1',
    [username]
  );
  return res.rows[0] || null;
}

async function createUser(id, username, avatar, passwordHash) {
  await pool.query(
    'INSERT INTO users (id, username, avatar, password) VALUES ($1, $2, $3, $4)',
    [id, username, avatar || '', passwordHash]
  );
  return { id, username, avatar: avatar || '' };
}

async function loginOrRegister(username, password, avatar) {
  const res = await pool.query(
    'SELECT id, username, avatar, password FROM users WHERE username ILIKE $1',
    [username]
  );
  const row = res.rows[0];
  if (!row) {
    const id = `user_${Date.now()}`;
    const hash = bcrypt.hashSync(String(password), 10);
    return await createUser(id, username, avatar, hash);
  }
  const ok = bcrypt.compareSync(String(password), row.password);
  if (!ok) throw new Error('用户名或密码不正确');

  if (avatar && avatar !== row.avatar) {
    await pool.query('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, row.id]);
    return { id: row.id, username: row.username, avatar };
  }
  return { id: row.id, username: row.username, avatar: row.avatar };
}

// 搜索用户
async function searchUsers(query, excludeId) {
  if (query && query.trim()) {
    const res = await pool.query(
      'SELECT id, username, avatar FROM users WHERE username ILIKE $1 AND ($2::text IS NULL OR id<>$2)',
      [`%${query}%`, excludeId || null]
    );
    return res.rows;
  } else {
    const res = await pool.query(
      'SELECT id, username, avatar FROM users WHERE ($1::text IS NULL OR id<>$1)',
      [excludeId || null]
    );
    return res.rows;
  }
}

// 消息相关
async function saveMessage(message) {
  await pool.query(
    'INSERT INTO messages (id, senderId, receiverId, content, type, timestamp, isRead) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [
      message.id,
      message.senderId,
      message.receiverId,
      message.content,
      message.type,
      typeof message.timestamp === 'number'
        ? message.timestamp
        : new Date(message.timestamp).getTime(),
      message.isRead ? true : false,
    ]
  );
}

async function getMessagesForUser(userId) {
  const res = await pool.query(
    'SELECT * FROM messages WHERE receiverId=$1 ORDER BY timestamp ASC',
    [userId]
  );
  return res.rows.map(r => ({
    ...r,
    timestamp: new Date(Number(r.timestamp)),
    isRead: r.isread,
  }));
}

async function getMessagesForConversation(userIdA, userIdB) {
  const res = await pool.query(
    `SELECT * FROM messages 
     WHERE (senderId=$1 AND receiverId=$2) OR (senderId=$2 AND receiverId=$1)
     ORDER BY timestamp ASC`,
    [userIdA, userIdB]
  );
  return res.rows.map(r => ({
    ...r,
    timestamp: new Date(Number(r.timestamp)),
    isRead: r.isread,
  }));
}

// 好友请求

// 获取某个用户收到的好友请求（含请求发起人信息）
async function getFriendRequestsForUser(userId) {
  const res = await pool.query(
    `SELECT fr.id, fr.fromUserId, fr.toUserId, fr.status, fr.timestamp,
            u.id as from_id, u.username as from_username, u.avatar as from_avatar
     FROM friend_requests fr
     JOIN users u ON u.id = fr.fromUserId
     WHERE fr.toUserId=$1
     ORDER BY fr.timestamp DESC`,
    [userId]
  );
  return res.rows.map(r => ({
    id: r.id,
    status: r.status,
    timestamp: new Date(Number(r.timestamp)),
    fromUser: {
      id: r.from_id,
      username: r.from_username,
      avatar: r.from_avatar
    },
    toUserId: r.touserid
  }));
}

async function getFriendRequestById(requestId) {
  const res = await pool.query(
    `SELECT id, fromUserId, toUserId, status, timestamp
     FROM friend_requests 
     WHERE id=$1`,
    [requestId]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    fromUserId: r.fromuserid,
    toUserId: r.touserid,
    status: r.status,
    timestamp: new Date(Number(r.timestamp))
  };
}


async function saveFriendRequest(req) {
  await pool.query(
    `INSERT INTO friend_requests (id, fromUserId, toUserId, status, timestamp)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET status=$4, timestamp=$5`,
    [
      req.id,
      req.fromUserId,
      req.toUserId,
      req.status,
      typeof req.timestamp === 'number'
        ? req.timestamp
        : new Date(req.timestamp).getTime(),
    ]
  );
}

async function updateFriendRequestStatus(id, status) {
  await pool.query('UPDATE friend_requests SET status=$1 WHERE id=$2', [
    status,
    id,
  ]);
}

async function addBidirectionalFriendship(userId, friendId) {
  await pool.query(
    'INSERT INTO friends (userId, friendId) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, friendId]
  );
  await pool.query(
    'INSERT INTO friends (userId, friendId) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [friendId, userId]
  );
}

async function getFriendsForUser(userId) {
  const res = await pool.query(
    `SELECT u.id, u.username, u.avatar
     FROM friends f
     JOIN users u ON u.id=f.friendId
     WHERE f.userId=$1`,
    [userId]
  );
  return res.rows;
}

// 获取所有用户
async function getAllUsers() {
  const res = await pool.query('SELECT id, username, avatar FROM users');
  return res.rows;
}

module.exports = {
  getUserById,
  getUserByUsername,
  loginOrRegister,
  searchUsers,
  saveMessage,
  getMessagesForUser,
  getMessagesForConversation,
  saveFriendRequest,
  updateFriendRequestStatus,
  addBidirectionalFriendship,
  getFriendsForUser,
  getAllUsers,
  getFriendRequestsForUser,
  getFriendRequestById
};
