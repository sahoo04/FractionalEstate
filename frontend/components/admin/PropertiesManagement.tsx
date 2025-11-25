'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { getImageUrl } from '@/lib/image-utils'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { WardBoyStatus } from './WardBoyStatus'

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

export function PropertiesManagementContent() {
  const { role } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch properties
  useEffect(() => {
    if (role !== 'ADMIN') return

    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/admin/properties/list')
        if (response.ok) {
          const data = await response.json()
          setProperties(data.properties || [])
          setFilteredProperties(data.properties || [])
        }
      } catch (error) {
        console.error('Error fetching properties:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [role])

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

  const togglePropertyStatus = async (id: string, currentStatus: string) => {
    try {
      // Toggle between ACTIVE and DELISTED
      const newStatus = currentStatus === 'ACTIVE' ? 'DELISTED' : 'ACTIVE'
      
      const response = await fetch(`/api/admin/properties/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setProperties(prev => prev.map(p => 
          p.id === id ? { ...p, status: newStatus as any } : p
        ))
      }
    } catch (error) {
      console.error('Error toggling property status:', error)
    }
  }

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Properties Management</h1>
          <p className="text-gray-600">View and manage all platform properties</p>
        </div>
        <Link 
          href="/seller/create-property"
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          + Add Property
        </Link>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Filters */}
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

      {/* Properties Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No properties found</p>
          <Link 
            href="/seller/create-property"
            className="text-primary-500 hover:underline"
          >
            Add your first property
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Image */}
                <div className="h-48 bg-gray-200 relative">
                  {property.images && property.images.length > 0 && getImageUrl(property.images[0]) ? (
                    <img 
                      src={getImageUrl(property.images[0])} 
                      alt={property.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  {(!property.images || property.images.length === 0 || !getImageUrl(property.images[0])) && (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
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
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{property.name}</h3>
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
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/property/${property.token_id}`}
                        className="flex-1 px-3 py-2 text-center border border-primary-500 text-primary-500 rounded hover:bg-primary-50"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => togglePropertyStatus(property.id, property.status)}
                        disabled={property.status === 'SOLD'}
                        className={`flex-1 px-3 py-2 rounded ${
                          property.status === 'SOLD'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : property.status === 'ACTIVE'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {property.status === 'SOLD' ? 'Sold' : property.status === 'ACTIVE' ? 'Delist' : 'Activate'}
                      </button>
                    </div>

                    {/* Ward Boy Management */}
                    <div className="border-t pt-3 mt-2">
                      <WardBoyStatus tokenId={property.token_id} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-sm text-gray-600">
            Showing {filteredProperties.length} of {properties.length} properties
          </div>
        </>
      )}
    </>
  )
}
