'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/WalletButton'
import { useAuth } from '@/contexts/AuthContext'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin/overview" className="text-2xl font-bold text-primary">
                Admin Panel
              </Link>
              <div className="flex gap-4">
                <Link 
                  href="/admin/overview" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Overview
                </Link>
                <Link 
                  href="/admin/kyc" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  KYC Management
                </Link>
                <Link 
                  href="/admin/users" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Users
                </Link>
                <Link 
                  href="/admin/properties" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Properties
                </Link>
                <Link 
                  href="/admin/revenue" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Revenue Management
                </Link>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
