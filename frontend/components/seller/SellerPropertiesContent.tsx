'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { EmptyState } from '@/components/EmptyState'
import { getImageUrl } from '@/lib/image-utils'

interface Property {
  id: string
  token_id: number
  seller_wallet: string
  name: string
  location: string
  address: string
  city: string
  state: string
  zipcode: string
  description: string
  images: string[]
  property_type: string
  total_shares: number
  price_per_share: string
  metadata_uri: string
  status: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'DELISTED'
  listing_date: string
  created_at: string
  updated_at: string
  amenities?: string[]
}

export function SellerPropertiesContent() {
  const { address } = useAccount()
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch seller's properties
  useEffect(() => {
    if (!address) return

    const fetchProperties = async () => {
      try {
        // Fetch properties owned by this seller
        const response = await fetch(`/api/properties/list?owner=${address}`)
        if (response.ok) {
          const data = await response.json()
          setProperties(data.properties || [])
          setFilteredProperties(data.properties || [])
        } else {
          console.error('Failed to fetch properties')
        }
      } catch (error) {
        console.error('Error fetching properties:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [address])

  // Apply filters
  useEffect(() => {
    let filtered = [...properties]

    if (filterStatus === 'ACTIVE') {
      filtered = filtered.filter(p => p.status === 'ACTIVE')
    } else if (filterStatus === 'INACTIVE') {
      filtered = filtered.filter(p => p.status === 'DRAFT' || p.status === 'DELISTED')
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      )
    }

    setFilteredProperties(filtered)
  }, [filterStatus, searchQuery, properties])

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your properties...</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Properties</h1>
          <p className="text-gray-600">Manage your real estate listings</p>
        </div>
        <Link 
          href="/seller/create-property"
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          + Create Property
        </Link>
      </div>

      {/* Stats Summary */}
      {properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Properties</div>
            <div className="text-2xl font-bold">{properties.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">
              {properties.filter(p => p.status === 'ACTIVE').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Draft/Inactive</div>
            <div className="text-2xl font-bold text-gray-600">
              {properties.filter(p => p.status === 'DRAFT' || p.status === 'DELISTED').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Shares</div>
            <div className="text-2xl font-bold">
              {properties.reduce((sum, p) => sum + p.total_shares, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {properties.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Property name or location..."
                className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ALL">All Properties</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        properties.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="No Properties Yet"
            description="You haven't created any properties yet. Get started by creating your first property listing."
            action={
              <Link 
                href="/seller/create-property"
                className="px-6 py-3 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                Create Property
              </Link>
            }
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No properties match your search criteria</p>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="h-48 bg-gray-200 relative">
                  {property.images && property.images.length > 0 && getImageUrl(property.images[0]) ? (
                    <img 
                      src={getImageUrl(property.images[0])} 
                      alt={property.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  {(!property.images || property.images.length === 0 || !getImageUrl(property.images[0])) && (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      property.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : property.status === 'SOLD'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  {property.property_type && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                        {property.property_type}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1 truncate">{property.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">📍 {property.location}</p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {property.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div>
                      <div className="text-gray-500">Price/Share</div>
                      <div className="font-semibold">${property.price_per_share}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Shares</div>
                      <div className="font-semibold">
                        {property.total_shares.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Location</div>
                      <div className="font-semibold text-gray-700">
                        {property.city}, {property.state}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Token ID</div>
                      <div className="font-semibold text-blue-600">
                        #{property.token_id}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/property/${property.token_id}`}
                      className="flex-1 px-3 py-2 text-center border border-primary-500 text-primary-500 rounded hover:bg-primary-50 transition-colors"
                    >
                      View Details
                    </Link>
                    {property.status === 'DRAFT' && (
                      <Link
                        href={`/seller/edit-property/${property.id}`}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="Edit Property"
                      >
                        ✏️
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-sm text-gray-600 text-center">
            Showing {filteredProperties.length} of {properties.length} properties
          </div>
        </>
      )}
    </>
  )
}
