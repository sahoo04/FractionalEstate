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
        setSuccess(`Property ${newStatus === 'ACTIVE' ? 'activated' : 'delisted'} successfully`)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Error toggling property status:', error)
      setError('Failed to update property status')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-web3-500 to-primary-500 rounded-2xl p-8 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white break-words">Properties Management</h1>
              <p className="text-white/90 break-words">View and manage all platform properties</p>
            </div>
          </div>
          <Link 
            href="/seller/create-property"
            className="px-6 py-3 bg-white text-web3-600 font-semibold rounded-xl hover:shadow-xl transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Property
          </Link>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 font-medium break-words">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-success-50 border-2 border-success-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
          <CheckCircle className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-success-800 font-medium break-words">{success}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Properties
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Property name or location..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="ALL">All Properties ({properties.length})</option>
              <option value="ACTIVE">Active ({properties.filter(p => p.status === 'ACTIVE').length})</option>
              <option value="INACTIVE">Inactive ({properties.filter(p => p.status === 'DRAFT' || p.status === 'DELISTED').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-56 bg-gray-200" />
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center border border-gray-100">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-web3-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-medium mb-4">No properties found</p>
          <Link 
            href="/seller/create-property"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add your first property
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div key={property.id} className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1">
                {/* Image */}
                <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200">
                  {property.images && property.images.length > 0 && getImageUrl(property.images[0]) ? (
                    <img 
                      src={getImageUrl(property.images[0])} 
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg backdrop-blur-sm ${
                      property.status === 'ACTIVE' 
                        ? 'bg-success-500 text-white' 
                        : property.status === 'SOLD'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 break-words group-hover:text-primary-600 transition-colors">{property.name}</h3>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium break-words">{property.location}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 break-words">
                    {property.description}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-3">
                      <div className="text-xs text-primary-600 font-semibold mb-1">Price/Share</div>
                      <div className="text-lg font-bold text-primary-900">${property.price_per_share}</div>
                    </div>
                    <div className="bg-gradient-to-br from-web3-50 to-web3-100 rounded-xl p-3">
                      <div className="text-xs text-web3-600 font-semibold mb-1">Total Shares</div>
                      <div className="text-lg font-bold text-web3-900">{property.total_shares.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/admin/properties/${property.token_id}`}
                        className="px-4 py-2.5 text-center border-2 border-primary-500 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <button
                        onClick={() => togglePropertyStatus(property.id, property.status)}
                        disabled={property.status === 'SOLD'}
                        className={`px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                          property.status === 'SOLD'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : property.status === 'ACTIVE'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg'
                            : 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:shadow-lg'
                        }`}
                      >
                        {property.status === 'SOLD' ? (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Sold
                          </>
                        ) : property.status === 'ACTIVE' ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Delist
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Activate
                          </>
                        )}
                      </button>
                    </div>

                    {/* Ward Boy Management */}
                    <div className="border-t-2 border-gray-100 pt-3">
                      <WardBoyStatus tokenId={property.token_id} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredProperties.length}</span> of <span className="font-bold text-gray-900">{properties.length}</span> properties
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 bg-success-100 text-success-700 rounded-lg font-semibold">
                  {properties.filter(p => p.status === 'ACTIVE').length} Active
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-semibold">
                  {properties.filter(p => p.status === 'DRAFT' || p.status === 'DELISTED').length} Inactive
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
