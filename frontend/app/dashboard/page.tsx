'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layouts/MainLayout'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default function DashboardPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <MainLayout>
        <DashboardContent />
      </MainLayout>
    </ProtectedRoute>
  )
}
