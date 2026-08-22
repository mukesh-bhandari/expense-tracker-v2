import { request } from './client'

export function sendInvite(payload: {
  email: string
  roomId: number | null
}): Promise<{ message: string }> {
  return request('/api/invite/send-invite', { method: 'POST', body: payload })
}

export function verifyToken(params: {
  token: string
  email: string
  roomId?: string
}): Promise<{ roomId: number }> {
  const query = new URLSearchParams({
    token: params.token,
    email: params.email,
  })
  if (params.roomId) {
    query.set('roomId', params.roomId)
  }
  return request(`/api/invite/verify-token?${query.toString()}`)
}

export function acceptInvite(payload: {
  token: string
  email: string
  roomId: string | null
}): Promise<{ message: string }> {
  return request('/api/invite/accept-invite', { method: 'POST', body: payload })
}
