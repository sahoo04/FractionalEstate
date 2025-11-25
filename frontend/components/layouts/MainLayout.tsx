'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/WalletButton'
import { useAuth } from '@/contexts/AuthContext'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { role, isAdmin, isSeller } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Navigation */}
      <nav className="glass-nav sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/" className="text-2xl font-bold transition-transform duration-300 hover:scale-105">
                <span className="text-primary transition-colors duration-300">Fractional</span>
                <span className="text-gray-900 transition-colors duration-300">Stay</span>
              </Link>
              
              {/* Navigation Links */}
              <div className="hidden md:flex gap-6">
                {/* Common Links for all logged-in users */}
                {role !== 'NONE' && (
                  <>
                    <Link 
                      href="/dashboard" 
                      className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                    >
                      Dashboard
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <Link 
                      href="/marketplace" 
                      className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                    >
                      Marketplace
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </>
                )}

                {/* Seller-specific links */}
                {isSeller && (
                  <>
                    <Link 
                      href="/seller/properties" 
                      className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                    >
                      My Properties
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <Link 
                      href="/seller/create-property" 
                      className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                    >
                      List Property
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </>
                )}

                {/* Admin link */}
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                  >
                    Admin Panel
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}

                {/* Public links */}
                <Link 
                  href="/properties" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Properties
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
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
