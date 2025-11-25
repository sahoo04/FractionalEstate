'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: string[]
  requireKYC?: boolean
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles = [],
  requireKYC = false,
  redirectTo = '/dashboard'
}: ProtectedRouteProps) {
  const router = useRouter()
  const { role, kycStatus, isLoading, isRegistered } = useAuth()

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return

    // Check if authentication is required
    if (requireAuth && !isRegistered) {
      router.push('/')
      return
    }

    // Check if specific roles are required
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      router.push(redirectTo)
      return
    }

    // Check if KYC is required
    if (requireKYC && kycStatus !== 'APPROVED') {
      router.push('/kyc')
      return
    }
  }, [isLoading, isRegistered, role, kycStatus, requireAuth, allowedRoles, requireKYC, router, redirectTo])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Check authorization
  if (requireAuth && !isRegistered) {
    return null
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return null
  }

  if (requireKYC && kycStatus !== 'APPROVED') {
    return null
  }

  return <>{children}</>
}
