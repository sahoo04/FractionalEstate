'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layouts/MainLayout'
import { SellerPropertiesContent } from '@/components/seller/SellerPropertiesContent'

export default function SellerPropertiesPage() {
  return (
    <ProtectedRoute requireAuth={true} allowedRoles={['SELLER']} requireKYC={true}>
      <MainLayout>
        <SellerPropertiesContent />
      </MainLayout>
    </ProtectedRoute>
  )
}
