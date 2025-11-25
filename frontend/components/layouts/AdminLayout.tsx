'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/WalletButton'
import { useAuth } from '@/contexts/AuthContext'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="glass-nav sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin/overview" className="text-2xl font-bold text-primary transition-transform duration-300 hover:scale-105">
                Admin Panel
              </Link>
              <div className="flex gap-4">
                <Link 
                  href="/admin/overview" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Overview
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  href="/admin/kyc" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  KYC Management
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  href="/admin/users" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Users
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  href="/admin/properties" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Properties
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  href="/admin/revenue" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Revenue Management
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
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
