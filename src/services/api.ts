const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://chatting-app-cy6c.onrender.com'

export interface LoginResponse {
  id: string
  username: string
  status: 'online' | 'offline'
}

export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || '登录失败')
  }
  return res.json()
}

export async function apiSearchUsers(query: string, excludeId?: string) {
  const url = new URL(`${BASE_URL}/api/users/search`)
  if (query) url.searchParams.set('query', query)
  if (excludeId) url.searchParams.set('excludeId', excludeId)
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('搜索失败')
  }
  return res.json()
}

export async function apiGetFriends(userId: string) {
  const res = await fetch(`${BASE_URL}/api/friends/${userId}`)
  if (!res.ok) throw new Error('获取好友失败')
  return res.json()
}

export async function apiGetFriendRequests(userId: string) {
  const res = await fetch(`${BASE_URL}/api/friend-requests/${userId}`)
  if (!res.ok) throw new Error('获取好友请求失败')
  return res.json()
}

export async function apiGetConversation(userIdA: string, userIdB: string) {
  const res = await fetch(`${BASE_URL}/api/conversations/${userIdA}/${userIdB}`)
  if (!res.ok) throw new Error('获取会话历史失败')
  return res.json()
}
