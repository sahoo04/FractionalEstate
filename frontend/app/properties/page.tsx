'use client'

import { PropertyCard } from '@/components/PropertyCard'
import { MainLayout } from '@/components/layouts/MainLayout'
import { useState, useEffect } from 'react'
import { getIPFSUrl } from '@/lib/ipfs'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'funded'>('all')

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

  const filteredProperties = properties
    .filter(prop => {
      if (filter === 'all') return true
      const sold = Number(prop.minted_shares) || 0
      const total = Number(prop.total_shares)
      const available = total - sold
      
      if (filter === 'available') return available > 0
      if (filter === 'funded') return available === 0
      return true
    })
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

  return (
    <MainLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Properties</h1>
          <p className="text-gray-600">
            Browse and invest in premium real estate opportunities
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-primary'
            }`}
          >
            All Properties
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'available'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-primary'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilter('funded')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'funded'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-primary'
            }`}
          >
            Fully Funded
          </button>
          <div className="ml-auto text-sm text-gray-600">
            {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading properties...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="card text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Properties Found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No properties have been listed yet.' 
                : filter === 'available'
                ? 'All properties are fully funded.'
                : 'No fully funded properties yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => {
              // Convert IPFS URL to gateway URL for first image
              // Only set imageUrl if property actually has images
              let imageUrl: string | undefined = undefined
              if (property.images && property.images.length > 0 && property.images[0]) {
                const firstImage = property.images[0]
                if (firstImage.startsWith('ipfs://')) {
                  imageUrl = getIPFSUrl(firstImage.replace('ipfs://', ''))
                } else if (firstImage.startsWith('http')) {
                  imageUrl = firstImage
                } else if (firstImage.trim() !== '') {
                  imageUrl = getIPFSUrl(firstImage)
                }
              }
              
              return (
                <PropertyCard 
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

        {/* Stats Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {properties.length}
            </div>
            <div className="text-gray-600">Total Properties</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {properties.filter(p => {
                const sold = Number(p.minted_shares) || 0
                const total = Number(p.total_shares)
                return total - sold > 0
              }).length}
            </div>
            <div className="text-gray-600">Available Now</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ₹{((properties.reduce((sum, p) => sum + (Number(p.total_shares) * Number(p.price_per_share)), 0) / 1e6) * 100).toFixed(0)}L
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
        </div>
      </main>
    </MainLayout>
  )
}
