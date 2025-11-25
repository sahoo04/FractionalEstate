'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { UsersManagementContent } from '@/components/admin/UsersManagement'

export default function UsersManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/dashboard">
      <AdminLayout>
        <UsersManagementContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
