const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001'

export interface LoginResponse {
  id: string
  username: string
  avatar?: string
  status: 'online' | 'offline'
}

export async function apiLogin(username: string, avatar?: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, avatar }),
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
