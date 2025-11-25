'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useReadContract, useAccount } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { BuySharesForm } from '@/components/BuySharesForm'
import { ClaimRewards } from '@/components/ClaimRewards'
import { getImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, Users, TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react'

interface PropertyData {
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
  property_type: string
  total_shares: number
  price_per_share: string
  images: string[]
  amenities: string[]
  metadata_uri: string
  status: string
  created_at: string
  updated_at: string
  metadata?: any
}

export default function AdminPropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tokenId = Number(params.id)
  const { isSeller } = useAuth()
  const { address } = useAccount()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Fetch property from database
  const fetchProperty = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/property/${tokenId}`)
      
      if (!response.ok) {
        throw new Error('Property not found')
      }
      
      const data = await response.json()
      setProperty(data.property)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProperty()
    // Refetch when user navigates back to this page (e.g., from properties list)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProperty()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [tokenId])

  // Fetch marketplace listings for this property
  useEffect(() => {
    const fetchMarketplaceListings = async () => {
      try {
        const response = await fetch('/api/marketplace/listings')
        if (response.ok) {
          const data = await response.json()
          // Filter listings for this property only
          const propertyListings = data.listings.filter(
            (listing: any) => listing.tokenId === tokenId
          )
          setMarketplaceListings(propertyListings)
        }
      } catch (error) {
        console.error('Error fetching marketplace listings:', error)
      }
    }

    fetchMarketplaceListings()
  }, [tokenId])

  // Fetch blockchain data for totalSupply
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'totalSupply',
    args: [BigInt(tokenId)],
  })

  // Fetch user's balance for this property
  const { data: userBalance } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'balanceOf',
    args: address ? [address, BigInt(tokenId)] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const userSharesOwned = userBalance ? Number(userBalance as bigint) : 0
  const isOwner = userSharesOwned > 0

  // Toggle property status
  const togglePropertyStatus = async () => {
    if (!property) return
    
    try {
      setIsUpdating(true)
      setError(null)
      const newStatus = property.status === 'ACTIVE' ? 'DELISTED' : 'ACTIVE'
      
      const response = await fetch(`/api/admin/properties/${property.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh property data from database to ensure sync
      await fetchProperty()
      setSuccess(`Property ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully!`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update property status')
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'This property does not exist'}</p>
        </div>
      </div>
    )
  }

  const totalSupplyValue = (totalSupply as bigint) || 0n
  const totalShares = BigInt(property.total_shares)
  
  // Calculate shares listed on marketplace
  const listedShares = marketplaceListings.reduce((total, listing) => {
    return total + Number(listing.sharesAmount)
  }, 0)
  
  // Available = Total - Sold (not including marketplace listings since they're already sold)
  const availableShares = totalShares - totalSupplyValue
  const fundingProgress = Number(totalSupplyValue) / Number(totalShares) * 100
  
  // Get property images with fallback
  const images = property.images && property.images.length > 0
    ? property.images.map(img => getImageUrl(img)).filter((url): url is string => url !== null && url !== '')
    : []

  // Add fallback images if needed
  if (images.length === 0) {
    images.push('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop')
  }

  const amenities = property.amenities && property.amenities.length > 0
    ? property.amenities
    : ['Swimming Pool', 'Valet Parking', 'Fitness Center', 'Rooftop Lounge', '24/7 Security', 'High Speed WiFi', 'Concierge Service', 'Air Conditioning']

  const pricePerShare = parseFloat(property.price_per_share)

  return (
    <div className="space-y-6">
      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-green-800 font-semibold">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-red-800 font-semibold">{error}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-web3-50 rounded-2xl shadow-card p-8 border-2 border-primary-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-primary-500 to-web3-500 rounded-2xl shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              <span className={`px-3 py-1 text-sm font-bold rounded-xl ${
                property.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {property.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{property.location}</span>
              <span className="mx-2">•</span>
              <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                {property.property_type}
              </span>
              <span className="mx-2">•</span>
              <span className="font-mono text-sm">Token #{tokenId}</span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          {property.description || 'A premium real estate investment opportunity featuring tokenized shares on the blockchain.'}
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-gray-600">Property Value</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${((property.total_shares * pricePerShare) / 1000).toFixed(0)}K
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-sm text-gray-600">Total Shares</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{property.total_shares.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-sm text-gray-600">Shares Sold</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{Number(totalSupplyValue).toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">{Number(availableShares).toLocaleString()}</div>
          </div>
        </div>

        {/* Funding Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Funding Progress</span>
            <span className="font-bold text-gray-900">{fundingProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-primary-500 to-web3-500 h-full rounded-full transition-all shadow-md"
              style={{ width: `${fundingProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-gray-200">
            <div className="relative h-[400px] group">
              <Image
                src={images[0]}
                alt={property.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50">
                {images.slice(1).map((img, idx) => (
                  <div key={idx} className="relative h-20 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition group">
                    <Image src={img} alt={`View ${idx + 2}`} fill className="object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Property Information */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Property Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Address</div>
                <div className="font-semibold text-gray-900">{property.address || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">City</div>
                <div className="font-semibold text-gray-900">{property.city || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">State</div>
                <div className="font-semibold text-gray-900">{property.state || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Zipcode</div>
                <div className="font-semibold text-gray-900">{property.zipcode || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Price per Share</div>
                <div className="font-bold text-primary-600 text-lg">${pricePerShare.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Seller Wallet</div>
                <div className="font-mono text-xs text-gray-900">
                  {property.seller_wallet.slice(0, 6)}...{property.seller_wallet.slice(-4)}
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marketplace Listings */}
          {marketplaceListings.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl shadow-card p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Secondary Market Listings</h2>
                  <p className="text-sm text-gray-600">{marketplaceListings.length} active {marketplaceListings.length === 1 ? 'listing' : 'listings'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketplaceListings.map((listing) => {
                  const listingPrice = parseFloat(listing.pricePerShare)
                  const totalPrice = parseFloat(listing.totalPrice)
                  const isMyListing = address && listing.sellerWallet.toLowerCase() === address.toLowerCase()
                  
                  return (
                    <div 
                      key={listing.id} 
                      className={`p-5 bg-white rounded-xl border-2 transition-all hover:shadow-md ${
                        isMyListing ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white' : 'border-purple-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isMyListing ? 'bg-gradient-to-br from-yellow-400 to-orange-400' : 'bg-gradient-to-br from-purple-400 to-pink-400'
                          }`}>
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-mono text-xs text-gray-600">
                              {listing.sellerWallet.slice(0, 6)}...{listing.sellerWallet.slice(-4)}
                            </div>
                            {isMyListing && (
                              <div className="text-xs font-bold text-yellow-700">Your Listing</div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Shares</span>
                          <span className="font-bold text-gray-900 text-xl">{listing.sharesAmount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Price/Share</span>
                          <span className="font-semibold text-gray-900">${listingPrice.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700">Total Price</span>
                          <span className="font-bold text-purple-600 text-2xl">
                            ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <Link 
                        href={isMyListing ? "/dashboard" : "/marketplace"}
                        className={`block w-full py-3 px-4 text-center rounded-xl font-semibold text-sm transition-all ${
                          isMyListing 
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:shadow-lg'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                        }`}
                      >
                        {isMyListing ? 'Manage Listing' : 'View on Marketplace'} →
                      </Link>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-purple-200">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5">ℹ️</div>
                  <div>
                    <strong className="font-bold text-gray-900">Secondary Market:</strong> {listedShares.toLocaleString()} shares available from existing investors. 
                    A 2.5% marketplace fee applies (deducted from seller).
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Blockchain Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Blockchain Info */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Blockchain Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Token Standard</span>
                <span className="font-semibold text-gray-900">ERC-1155</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Network</span>
                <span className="font-semibold text-gray-900">Arbitrum Sepolia</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Token ID</span>
                <span className="font-mono text-sm font-bold text-gray-900">#{tokenId}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Contract</span>
                <span className="font-mono text-xs text-gray-900">
                  {CONTRACTS.PropertyShare1155.slice(0, 6)}...{CONTRACTS.PropertyShare1155.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Share Distribution */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Share Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Supply</span>
                <span className="font-bold text-gray-900">{property.total_shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Shares Sold</span>
                <span className="font-bold text-blue-600">{Number(totalSupplyValue).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Listed on Market</span>
                <span className="font-bold text-purple-600">{listedShares.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t-2 border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Available to Buy</span>
                  <span className="font-bold text-green-600 text-xl">{Number(availableShares).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-gradient-to-br from-primary-50 to-web3-50 rounded-2xl shadow-card p-6 border-2 border-primary-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pricing</h3>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-web3-600 bg-clip-text text-transparent mb-1">
                ${pricePerShare.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">per share</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="text-gray-600">10 shares</span>
                <span className="font-semibold text-gray-900">${(pricePerShare * 10).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="text-gray-600">50 shares</span>
                <span className="font-semibold text-gray-900">${(pricePerShare * 50).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="text-gray-600">100 shares</span>
                <span className="font-semibold text-gray-900">${(pricePerShare * 100).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Admin Quick Actions */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Admin Actions</h3>
            <div className="space-y-3">
              <button
                onClick={togglePropertyStatus}
                disabled={isUpdating || property.status === 'SOLD'}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  property.status === 'SOLD'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : property.status === 'ACTIVE'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg'
                }`}
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : property.status === 'SOLD' ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Property Sold
                  </>
                ) : property.status === 'ACTIVE' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Deactivate Property
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Activate Property
                  </>
                )}
              </button>

              <div className="h-px bg-gray-200"></div>

              <Link
                href={`/admin/properties`}
                className="block w-full py-2 px-4 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                ← All Properties
              </Link>
              <Link
                href={`/admin/revenue`}
                className="block w-full py-2 px-4 text-center bg-gradient-to-r from-primary-500 to-web3-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
              >
                💰 Manage Revenue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
