import { useState, useEffect, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { verifyAuth, logout as logoutRequest } from '../api/auth'
import type { User } from '../types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const verify = async () => {
      try {
        const data = await verifyAuth()
        setUser(data.user)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Auth verification failed:', error)
        setIsAuthenticated(false)
      }
    }

    verify()
  }, [])

  const logout = async () => {
    try {
      await logoutRequest()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      window.location.reload()
    }
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, setIsAuthenticated, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
