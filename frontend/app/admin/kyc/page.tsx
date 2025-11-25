'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { KYCManagementContent } from '@/components/admin/KYCManagementContent'

export default function AdminKYCPage() {
  return (
    <ProtectedRoute requireAuth={true} allowedRoles={['ADMIN']}>
      <AdminLayout>
        <KYCManagementContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
