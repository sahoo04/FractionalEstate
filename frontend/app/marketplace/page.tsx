'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layouts/MainLayout'
import { MarketplaceContent } from '@/components/marketplace/MarketplaceContent'

export default function MarketplacePage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <MainLayout>
        <MarketplaceContent />
      </MainLayout>
    </ProtectedRoute>
  )
}