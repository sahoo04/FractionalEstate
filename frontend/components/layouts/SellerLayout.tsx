'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/WalletButton'

export function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Seller Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold">
                <span className="text-primary">Fractional</span>
                <span className="text-gray-900">Stay</span>
              </Link>
              <div className="flex gap-4">
                <Link 
                  href="/seller/dashboard" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/seller/create-property" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Create Property
                </Link>
                <Link 
                  href="/seller/properties" 
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  My Listings
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
