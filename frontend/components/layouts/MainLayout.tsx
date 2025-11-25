'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/WalletButton'
import { useAuth } from '@/contexts/AuthContext'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { role, isAdmin, isSeller } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/" className="text-2xl font-bold">
                <span className="text-primary">Fractional</span>
                <span className="text-gray-900">Stay</span>
              </Link>
              
              {/* Navigation Links */}
              <div className="hidden md:flex gap-6">
                {/* Common Links for all logged-in users */}
                {role !== 'NONE' && (
                  <>
                    <Link 
                      href="/dashboard" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/marketplace" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      Marketplace
                    </Link>
                    <Link 
                      href="/ward-boy" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      Ward Boy
                    </Link>
                  </>
                )}

                {/* Seller-specific links */}
                {isSeller && (
                  <>
                    <Link 
                      href="/seller/properties" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      My Properties
                    </Link>
                    <Link 
                      href="/seller/create-property" 
                      className="text-gray-600 hover:text-primary transition-colors font-medium"
                    >
                      List Property
                    </Link>
                  </>
                )}

                {/* Admin link */}
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="text-gray-600 hover:text-primary transition-colors font-medium"
                  >
                    Admin Panel
                  </Link>
                )}

                {/* Public links */}
                <Link 
                  href="/properties" 
                  className="text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  Properties
                </Link>
              </div>
            </div>

            {/* Wallet Button */}
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>{children}</main>
    </div>
  )
}
