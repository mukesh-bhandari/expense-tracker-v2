import { createContext } from 'react'
import type { User } from '../types'

export interface AuthContextValue {
  isAuthenticated: boolean | null
  user: User | null
  setIsAuthenticated: (value: boolean) => void
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
