'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useUserRole } from '@/hooks/useUserRole'

interface AuthContextType {
  role: string
  kycStatus: string
  isLoading: boolean
  isAdmin: boolean
  isSeller: boolean
  isClient: boolean
  isRegistered: boolean
  isKYCApproved: boolean
  profile: any
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const userRole = useUserRole()

  return (
    <AuthContext.Provider value={userRole}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
