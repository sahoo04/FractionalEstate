'use client'

import { PropertyCard } from '@/components/PropertyCard'
import { MainLayout } from '@/components/layouts/MainLayout'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getIPFSUrl } from '@/lib/ipfs'

export default function Home() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true)
        // Fetch only ACTIVE properties from the database
        const response = await fetch('/api/properties/list?status=ACTIVE&limit=6')
        
        if (!response.ok) {
          console.error('Error fetching properties:', response.statusText)
          return
        }
        
        const data = await response.json()
        console.log('Fetched properties:', data)
        
        setProperties(data.properties || [])
      } catch (error) {
        console.error('Error fetching properties:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [])

  return (
    <MainLayout>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 via-transparent to-accent-50/50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 animate-slide-up">
              Own Premium Real Estate,
              <br />
              <span className="text-primary transition-colors duration-300">Earn Monthly Income</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-slide-up stagger-1">
              Invest in fractional shares of high-value properties and receive passive rental income from short-term stays. Start with as little as ₹15,000.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up stagger-2">
              <button className="btn-primary text-lg px-8 py-4">
                Start Investing Today
              </button>
              <button className="btn-secondary text-lg px-8 py-4">
                View Properties
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="stat-box-glass animate-slide-up stagger-1">
              <div className="stat-value text-primary transition-all duration-300">₹2.5Cr+</div>
              <div className="stat-label">Assets Under Management</div>
            </div>
            <div className="stat-box-glass animate-slide-up stagger-2">
              <div className="stat-value text-primary transition-all duration-300">8.5%</div>
              <div className="stat-label">Average Monthly Yield</div>
            </div>
            <div className="stat-box-glass animate-slide-up stagger-3">
              <div className="stat-value text-primary transition-all duration-300">500+</div>
              <div className="stat-label">Active Investors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 animate-slide-up">
              Why Choose FractionalStay?
            </h2>
            <p className="text-lg text-gray-600 animate-slide-up stagger-1">
              Democratizing real estate investment for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center glass-card p-6 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 animate-slide-up stagger-1">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 transition-colors duration-300 hover:text-primary-600">Low Entry Cost</h3>
              <p className="text-gray-600">
                Start investing in premium properties with as little as ₹15,000. No need for large capital or loans.
              </p>
            </div>

            <div className="text-center glass-card p-6 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 animate-slide-up stagger-2">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 transition-colors duration-300 hover:text-primary-600">Monthly Income</h3>
              <p className="text-gray-600">
                Receive consistent rental income from short-term stays, distributed monthly to your account.
              </p>
            </div>

            <div className="text-center glass-card p-6 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 animate-slide-up stagger-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 transition-colors duration-300 hover:text-primary-600">Easy Liquidity</h3>
              <p className="text-gray-600">
                Sell your shares anytime through our secondary marketplace. No lengthy property sale processes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 animate-slide-up">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 animate-slide-up stagger-1">
              Simple steps to start your real estate investment journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {[
              { num: 1, title: 'Browse Properties', desc: 'Explore our curated selection of premium properties.' },
              { num: 2, title: 'Choose Shares', desc: 'Select the number of shares you want to purchase.' },
              { num: 3, title: 'Complete KYC', desc: 'Quick and secure identity verification with document upload.' },
              { num: 4, title: 'Make Payment', desc: 'Secure payment through our integrated gateway.' },
              { num: 5, title: 'Earn Income', desc: 'Receive monthly rental income in your account.' },
            ].map((step, index) => (
              <div key={step.num} className={`text-center glass-card p-6 rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 animate-slide-up stagger-${index + 1}`}>
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold transition-transform duration-300 hover:scale-110 hover:shadow-glow">
                  {step.num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors duration-300 hover:text-primary-600">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Properties</h2>
              <p className="text-gray-600">Handpicked premium properties with high rental potential</p>
            </div>
            <Link href="/properties" className="btn-outline hidden md:block">
              View All Properties
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-20">
              {loading ? (
                <>
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Properties...</h3>
                  <p className="text-gray-600">Please wait while we fetch available properties</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Available</h3>
                  <p className="text-gray-600 mb-6">Check back soon for new investment opportunities</p>
                  <Link href="/admin" className="btn-primary">
                    Go to Admin Panel
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties
                .sort((a, b) => {
                  // Calculate progress percentage for each property
                  const progressA = ((a.minted_shares || 0) / a.total_shares) * 100
                  const progressB = ((b.minted_shares || 0) / b.total_shares) * 100
                  
                  // Sort: lower progress first, 100% last
                  // If both are 100%, keep original order
                  // If one is 100%, it goes last
                  if (progressA >= 100 && progressB >= 100) return 0
                  if (progressA >= 100) return 1
                  if (progressB >= 100) return -1
                  
                  // Otherwise sort by progress (ascending)
                  return progressA - progressB
                })
                .map((property, index) => {
                // Convert IPFS URL to gateway URL for first image
                // Only set imageUrl if property actually has images
                let imageUrl: string | undefined = undefined
                if (property.images && property.images.length > 0 && property.images[0]) {
                  const firstImage = property.images[0]
                  // If it starts with ipfs://, convert to gateway URL
                  if (firstImage.startsWith('ipfs://')) {
                    imageUrl = getIPFSUrl(firstImage.replace('ipfs://', ''))
                  } else if (firstImage.startsWith('http')) {
                    imageUrl = firstImage
                  } else if (firstImage.trim() !== '') {
                    // Assume it's just the hash
                    imageUrl = getIPFSUrl(firstImage)
                  }
                }
                
                return (
                  <div key={property.token_id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
                    <PropertyCard
                      property={{
                        id: property.token_id.toString(),
                        tokenId: Number(property.token_id),
                        name: property.name,
                        location: property.location,
                        imageUrl: imageUrl,
                        pricePerShare: Number(property.price_per_share),
                        totalShares: property.total_shares,
                        sharesSold: property.minted_shares || 0,
                        expectedAPY: 8.5,
                        propertyType: property.property_type || 'Villa',
                        investorCount: 0,
                        occupancyStatus: 'Available'
                      }}
                      variant="grid"
                      showInvestButton={true}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold mb-4">
                <span className="text-primary">Fractional</span>Stay
              </div>
              <p className="text-gray-400 text-sm">
                Making premium real estate investment accessible to everyone through fractional ownership.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">How it Works</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Invest</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/properties" className="hover:text-white">Properties</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/marketplace" className="hover:text-white">Secondary Market</Link></li>
                <li><a href="#" className="hover:text-white">Tax Documents</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Legal</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 FractionalStay. SEBI Registered Investment Advisor. Built on Arbitrum.</p>
          </div>
        </div>
      </footer>
    </MainLayout>
  )
}


