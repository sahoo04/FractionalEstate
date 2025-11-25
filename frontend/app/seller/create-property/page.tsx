'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layouts/MainLayout'
import { CreatePropertyContent } from '@/components/seller/CreatePropertyContent'

export default function CreatePropertyPage() {
  return (
    <ProtectedRoute requireAuth={true} allowedRoles={['SELLER']} requireKYC={true}>
      <MainLayout>
        <CreatePropertyContent />
      </MainLayout>
    </ProtectedRoute>
  )
}