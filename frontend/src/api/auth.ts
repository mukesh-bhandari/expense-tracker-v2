import { request } from './client'
import type { User } from '../types'

export interface VerifyResponse {
  message: string
  user: User
}

export function verifyAuth(): Promise<VerifyResponse> {
  return request<VerifyResponse>('/api/auth/verify')
}

export function login(payload: {
  username: string
  password: string
  keepSignedIn: boolean
}): Promise<{ message: string }> {
  return request('/api/auth/login', { method: 'POST', body: payload })
}

export function signup(payload: {
  email: string
  username: string
  password: string
}): Promise<{ message: string }> {
  return request('/api/auth/signup', { method: 'POST', body: payload })
}

export function sendCode(payload: {
  email: string
  purpose?: 'signup' | 'password_reset'
}): Promise<{ message: string }> {
  return request('/api/auth/send-code', { method: 'POST', body: payload })
}

export function verifyCode(payload: {
  email: string
  code: string
  purpose?: 'signup' | 'password_reset'
}): Promise<{ message: string }> {
  return request('/api/auth/verify-code', { method: 'POST', body: payload })
}

export function resetPassword(payload: {
  email: string
  code: string
  newPassword: string
}): Promise<{ message: string }> {
  return request('/api/auth/reset-password', { method: 'POST', body: payload })
}

export function logout(): Promise<{ message: string }> {
  return request('/api/auth/logout', { method: 'POST' })
}
