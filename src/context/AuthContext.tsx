import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { AppUser, UserRole } from '@/types/crm'

interface AuthContextType {
  user: AppUser | null
  role: UserRole
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const rec = pb.authStore.record
      return {
        ...rec,
        email: rec.email || '',
        name: rec.name || rec.email?.split('@')[0] || 'Usuário',
        role: (rec.role as UserRole) || 'vendedor',
        verified: !!rec.verified,
      } as AppUser
    }
    return null
  })

  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUser = async () => {
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const authData = await pb.collection('users').authRefresh<AppUser>()
        const rec = authData.record
        setUser({
          ...rec,
          email: rec.email || '',
          name: rec.name || rec.email?.split('@')[0] || 'Usuário',
          role: (rec.role as UserRole) || 'vendedor',
          verified: !!rec.verified,
        })
      } else {
        setUser(null)
      }
    } catch {
      pb.authStore.clear()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      if (model) {
        setUser({
          ...model,
          email: model.email || '',
          name: model.name || model.email?.split('@')[0] || 'Usuário',
          role: (model.role as UserRole) || 'vendedor',
          verified: !!model.verified,
        } as AppUser)
      } else {
        setUser(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword<AppUser>(email, pass)
    const rec = authData.record
    setUser({
      ...rec,
      email: rec.email || '',
      name: rec.name || rec.email?.split('@')[0] || 'Usuário',
      role: (rec.role as UserRole) || 'vendedor',
      verified: !!rec.verified,
    })
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const role: UserRole = user?.role || 'vendedor'
  const isAuthenticated = !!user && pb.authStore.isValid

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, role, isAuthenticated, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
