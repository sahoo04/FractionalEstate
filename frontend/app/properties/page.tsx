'use client'

import { PropertyCardV2, PropertyCardSkeleton } from '@/components/PropertyCard.v2'
import { MainLayout } from '@/components/layouts/MainLayout'
import { useState, useEffect } from 'react'
import { getIPFSUrl } from '@/lib/ipfs'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'funded'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'apy'>('newest')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all')

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true)
      try {
        // Fetch only ACTIVE properties from the database
        const response = await fetch('/api/properties/list?status=ACTIVE')
        
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

  // Get unique property types
  const propertyTypes = Array.from(new Set(properties.map(p => p.property_type || 'Villa'))).filter(Boolean)

  // Filter and sort properties
  const filteredProperties = properties
    .filter(prop => {
      // Funding filter
      const sold = Number(prop.minted_shares) || 0
      const total = Number(prop.total_shares)
      const available = total - sold
      
      if (filter === 'available' && available === 0) return false
      if (filter === 'funded' && available > 0) return false
      
      // Property type filter
      if (propertyTypeFilter !== 'all' && prop.property_type !== propertyTypeFilter) return false
      
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.token_id - a.token_id
      if (sortBy === 'price-low') return Number(a.price_per_share) - Number(b.price_per_share)
      if (sortBy === 'price-high') return Number(b.price_per_share) - Number(a.price_per_share)
      if (sortBy === 'apy') return 0 // Would compare APY if available
      return 0
    })

  // Calculate stats
  const totalValue = properties.reduce((sum, p) => sum + (Number(p.total_shares) * Number(p.price_per_share)), 0)
  const availableProperties = properties.filter(p => {
    const sold = Number(p.minted_shares) || 0
    const total = Number(p.total_shares)
    return total - sold > 0
  }).length

  return (
    <MainLayout>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-6 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-bold mb-3">Investment Properties</h1>
                <p className="text-primary-100 text-lg max-w-2xl">
                  Discover premium fractional real estate opportunities. Start building your property portfolio with as little as one share.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="text-3xl font-bold mb-1">{properties.length}</div>
                  <div className="text-primary-100 text-sm">Active Listings</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Advanced Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Funding Status Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Funding Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === 'all'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('available')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === 'available'
                        ? 'bg-success-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setFilter('funded')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === 'funded'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Funded
                  </button>
                </div>
              </div>

              {/* Property Type Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                <select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="all">All Types</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="apy">Highest APY</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{filteredProperties.length}</span> {filteredProperties.length === 1 ? 'property' : 'properties'} found
              </span>
              {filter !== 'all' || propertyTypeFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setFilter('all')
                    setPropertyTypeFilter('all')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              ) : null}
            </div>
          </div>

          {/* Properties Grid */}
          {loading ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-primary-600"></div>
                  <span className="text-lg font-medium text-gray-700">Loading premium properties...</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 mb-6">
                <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">No Properties Found</h3>
              <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
                {filter === 'all' && propertyTypeFilter === 'all'
                  ? 'No properties have been listed yet. Check back soon for exciting investment opportunities!' 
                  : 'No properties match your filters. Try adjusting your search criteria.'}
              </p>
              {(filter !== 'all' || propertyTypeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setFilter('all')
                    setPropertyTypeFilter('all')
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  View All Properties
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => {
                // Convert IPFS URL to gateway URL for first image
                let imageUrl = ''
                if (property.images && property.images.length > 0) {
                  const firstImage = property.images[0]
                  if (firstImage.startsWith('ipfs://')) {
                    imageUrl = getIPFSUrl(firstImage.replace('ipfs://', ''))
                  } else if (firstImage.startsWith('http')) {
                    imageUrl = firstImage
                  } else {
                    imageUrl = getIPFSUrl(firstImage)
                  }
                }
                
                return (
                  <PropertyCardV2 
                    key={property.token_id}
                    property={{
                      id: property.token_id.toString(),
                      tokenId: Number(property.token_id),
                      name: property.name,
                      location: property.location,
                      imageUrl: imageUrl,
                      pricePerShare: Number(property.price_per_share),
                      totalShares: Number(property.total_shares),
                      sharesSold: Number(property.minted_shares) || 0,
                      expectedAPY: 8.5,
                      propertyType: property.property_type || 'Villa',
                      investorCount: 0,
                      occupancyStatus: 'Available'
                    }}
                    variant="grid"
                    showInvestButton={true}
                  />
                )
              })}
            </div>
          )}

          {/* Investment Statistics */}
          {!loading && properties.length > 0 && (
            <div className="mt-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Platform Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{properties.length}</div>
                      <div className="text-sm text-gray-300">Total Properties</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-success-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-success-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{availableProperties}</div>
                      <div className="text-sm text-gray-300">Available Now</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">₹{(totalValue / 10000000).toFixed(1)}Cr</div>
                      <div className="text-sm text-gray-300">Total Value</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">8.5%</div>
                      <div className="text-sm text-gray-300">Avg. APY</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  )
}
