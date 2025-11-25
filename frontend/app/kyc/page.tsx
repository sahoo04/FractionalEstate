'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layouts/MainLayout'
import { KYCSubmissionContent } from '@/components/kyc/KYCSubmissionContent'

export default function KYCPage() {
  return (
    <ProtectedRoute requireAuth={false} requireKYC={false}>
      <MainLayout>
        <KYCSubmissionContent />
      </MainLayout>
    </ProtectedRoute>
  )
}