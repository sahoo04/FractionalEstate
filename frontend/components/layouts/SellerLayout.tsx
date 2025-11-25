'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/WalletButton'
import { useAuth } from '@/contexts/AuthContext'

export function SellerLayout({ children }: { children: React.ReactNode }) {
  const { isSeller } = useAuth()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Seller Navigation */}
      <nav className="glass-nav sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold transition-transform duration-300 hover:scale-105">
                <span className="text-primary transition-colors duration-300">Fractional</span>
                <span className="text-gray-900 transition-colors duration-300">Stay</span>
              </Link>
              <div className="flex gap-4">
                <Link 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
                {isSeller && (
                  <>
                    <Link 
                      href="/seller/create-property" 
                      className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                    >
                      Create Property
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                    <Link 
                      href="/seller/properties" 
                      className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                    >
                      My Properties
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </>
                )}
                <Link 
                  href="/properties" 
                  className="text-gray-600 hover:text-primary transition-all duration-300 font-medium hover:scale-105 relative group"
                >
                  Properties
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>{children}</main>
    </div>
  )
}
