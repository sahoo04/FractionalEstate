'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PropertiesManagementContent } from '@/components/admin/PropertiesManagement'

export default function PropertiesManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/dashboard">
      <AdminLayout>
        <PropertiesManagementContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
