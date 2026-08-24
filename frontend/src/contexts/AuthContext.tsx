import React, { createContext, useContext, useState, useEffect } from 'react'
import { clientService } from '../api/client'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: { username: string; password: string }) => Promise<User>
  logout: () => void
  isEmpresa: boolean
  isCliente: boolean
  canApprove: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('shm_access_token')
    if (token) {
      clientService.auth
        .me()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('shm_access_token')
          localStorage.removeItem('shm_refresh_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (credentials: { username: string; password: string }) => {
    const data = await clientService.auth.login(credentials)
    localStorage.setItem('shm_access_token', data.access)
    localStorage.setItem('shm_refresh_token', data.refresh)
    const userData = await clientService.auth.me()
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('shm_access_token')
    localStorage.removeItem('shm_refresh_token')
    setUser(null)
    window.location.href = '/login'
  }

  const isEmpresa = Boolean(user && (user.is_empresa ?? (user.role === 'EMPRESA_ADMIN' || user.role === 'EMPRESA_TECNICO' || user.is_superuser)))
  const isCliente = Boolean(user && (user.is_cliente ?? (user.role === 'CLIENTE_GERENTE' || user.role === 'CLIENTE_ANALISTA')))
  const canApprove = Boolean(user && (user.can_approve_cycles ?? (user.role === 'CLIENTE_GERENTE' || user.is_superuser)))

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isEmpresa, isCliente, canApprove }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}