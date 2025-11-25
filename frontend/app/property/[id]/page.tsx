'use client'

import { useParams } from 'next/navigation'
import { useReadContract, useAccount } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { BuySharesForm } from '@/components/BuySharesForm'
import { ClaimRewards } from '@/components/ClaimRewards'
import { WalletButton } from '@/components/WalletButton'
import { getImageUrl } from '@/lib/image-utils'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { parseUnits } from 'viem'

interface PropertyData {
  id: string
  token_id: number
  seller_wallet: string
  name: string
  location: string
  address: string
  city: string
  state: string
  description: string
  property_type: string
  total_shares: number
  price_per_share: string
  images: string[]
  amenities: string[]
  metadata_uri: string
  status: string
  created_at: string
  metadata?: any
}

export default function PropertyPage() {
  const params = useParams()
  const tokenId = Number(params.id)
  const { isSeller } = useAuth()
  const { address } = useAccount()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [marketplaceListings, setMarketplaceListings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch property from database
  useEffect(() => {
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

    fetchProperty()
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'This property does not exist'}</p>
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
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
  
  // Get property images - only use actual images, no mock/placeholder images
  const images = property.images && property.images.length > 0
    ? property.images.map(img => getImageUrl(img)).filter(url => url && url.trim() !== '')
    : []

  const amenities = property.amenities && property.amenities.length > 0
    ? property.amenities
    : ['Swimming Pool', 'Valet Parking', 'Fitness Center', 'Rooftop Lounge', '24/7 Security', 'High Speed WiFi', 'Concierge Service', 'Air Conditioning']

  const pricePerShare = parseFloat(property.price_per_share)
  const investmentAmount = 10 * pricePerShare // Default 10 shares
  
  // Mock revenue data (you can calculate from metadata if available)
  const monthlyRevenue = Math.round(pricePerShare * property.total_shares * 0.008) // ~0.8% of total value
  const platformFeeAmount = monthlyRevenue * 0.1
  const propertyManagement = monthlyRevenue * 0.05
  const netRevenue = monthlyRevenue - platformFeeAmount - propertyManagement

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center transition-transform duration-300 hover:scale-105">
              <span className="text-2xl font-bold">
                <span className="text-primary transition-colors duration-300">Fractional</span>
                <span className="text-gray-900 transition-colors duration-300">Stay</span>
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-primary">
                ← Back to Home
              </Link>
              <WalletButton />
              <button className="btn-primary">Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="glass-card rounded-lg overflow-hidden shadow-sm animate-fade-in">
              {images.length > 0 ? (
                <>
                  <div className="relative h-96 group">
                    <Image
                      src={images[0]}
                      alt={property.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  {images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2 p-4">
                      {images.slice(1).map((img, idx) => (
                        <div key={idx} className="relative h-24 rounded overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-lg">
                          <Image src={img} alt={`View ${idx + 2}`} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="relative h-96 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">No images available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property Info */}
            <div className="card-glass animate-slide-up">
              {/* Owner Badge */}
              {isOwner && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">You Own This Property! 🎉</div>
                        <div className="text-sm text-gray-600">You hold {userSharesOwned} shares</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{userSharesOwned}</div>
                      <div className="text-xs text-gray-600">shares</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 text-center p-2 bg-white rounded-md">
                      <div className="text-xs text-gray-600">Your Investment</div>
                      <div className="font-semibold text-gray-900">${(userSharesOwned * pricePerShare).toFixed(2)}</div>
                    </div>
                    <div className="flex-1 text-center p-2 bg-white rounded-md">
                      <div className="text-xs text-gray-600">Ownership %</div>
                      <div className="font-semibold text-gray-900">{((userSharesOwned / property.total_shares) * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {property.location}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {property.property_type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      property.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                    {isOwner && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Owner
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                {property.description || 'A premium real estate investment opportunity featuring tokenized shares on the blockchain. Earn passive income through fractional ownership of high-value properties with transparent, automated revenue distribution.'}
              </p>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Property Value</div>
                  <div className="text-xl font-bold text-gray-900">
                    ${((property.total_shares * pricePerShare) / 1000).toFixed(0)}K
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Shares</div>
                  <div className="text-xl font-bold text-gray-900">{property.total_shares.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Available Shares</div>
                  <div className="text-xl font-bold text-green-600">{Number(availableShares).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Secondary Marketplace Listings */}
            {marketplaceListings.length > 0 && (
              <div className="card-glass bg-gradient-to-br from-purple-50/80 to-pink-50/80 border-2 border-purple-200/50 animate-slide-up stagger-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Available on Secondary Market</h2>
                      <p className="text-sm text-gray-600">Buy shares from existing investors</p>
                    </div>
                  </div>
                  <Link 
                    href="/marketplace"
                    className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                  >
                    View All
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketplaceListings.map((listing) => {
                    const pricePerShare = parseFloat(listing.pricePerShare)
                    const totalPrice = parseFloat(listing.totalPrice)
                    const isMyListing = address && listing.sellerWallet.toLowerCase() === address.toLowerCase()
                    
                    return (
                      <div 
                        key={listing.id} 
                        className={`p-4 bg-white rounded-lg border-2 transition-all hover:shadow-md ${
                          isMyListing ? 'border-yellow-300 bg-yellow-50' : 'border-purple-200'
                        }`}
                      >
                        {/* Seller Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-8 h-8 rounded-full ${
                              isMyListing ? 'bg-yellow-200' : 'bg-purple-200'
                            } flex items-center justify-center`}>
                              <svg className={`w-4 h-4 ${
                                isMyListing ? 'text-yellow-700' : 'text-purple-700'
                              }`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-mono text-xs text-gray-600">
                                {listing.sellerWallet.slice(0, 6)}...{listing.sellerWallet.slice(-4)}
                              </div>
                              {isMyListing && (
                                <div className="text-xs font-semibold text-yellow-700">Your Listing</div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(listing.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Listing Details */}
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Shares</span>
                            <span className="font-bold text-gray-900 text-lg">{listing.sharesAmount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Price/Share</span>
                            <span className="font-semibold text-gray-900">${pricePerShare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Total</span>
                            <span className="font-bold text-purple-600 text-xl">
                              ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        {isMyListing ? (
                          <Link 
                            href="/dashboard"
                            className="block w-full py-2 px-4 text-center bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium text-sm"
                          >
                            Manage in Dashboard
                          </Link>
                        ) : (
                          <Link 
                            href="/marketplace"
                            className="block w-full py-2 px-4 text-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                          >
                            Buy on Marketplace
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Info Banner */}
                <div className="mt-4 p-3 bg-white/80 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-gray-700">
                      <strong className="font-semibold">Secondary Market:</strong> {listedShares.toLocaleString()} shares listed by existing investors. 
                      Prices may differ from the original price. A 2.5% marketplace fee applies (deducted from seller).
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Basic Info Only (No Investment Section) */}
          <div className="lg:col-span-1">
            <div className="card-glass sticky top-24 animate-slide-up stagger-1">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">${pricePerShare.toLocaleString()}</span>
                  <span className="text-sm text-gray-600">per share</span>
                </div>
              </div>

              {/* Funding Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Funding Progress</span>
                  <span className="font-semibold">{fundingProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${fundingProgress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {Number(totalSupplyValue).toLocaleString()} of {property.total_shares.toLocaleString()} shares sold
                </div>
              </div>

              {/* Basic Property Stats */}
              <div className="space-y-3 p-4 glass-card rounded-lg transition-all duration-300 hover:bg-white/80">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Shares</span>
                  <span className="font-bold text-gray-900">{property.total_shares.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sold</span>
                  <span className="font-bold text-blue-600">{Number(totalSupplyValue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Listed on Market</span>
                  <span className="font-bold text-purple-600">{listedShares.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-sm font-semibold text-gray-700">Available</span>
                  <span className="font-bold text-green-600 text-lg">{Number(availableShares).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Token ID</span>
                  <span className="font-mono text-sm text-gray-900">#{tokenId}</span>
                </div>
              </div>

              {/* Blockchain Info */}
              <div className="mt-4 p-3 glass-card bg-blue-50/50 rounded-lg transition-all duration-300 hover:bg-blue-50/70">
                <div className="text-xs text-blue-800 space-y-1">
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>ERC-1155 Token</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Arbitrum Sepolia</span>
                  </div>
                </div>
              </div>

              {/* Investment Form - Only show if shares are available */}
              {availableShares > 0n && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Invest in This Property</h3>
                  <BuySharesForm
                    tokenId={tokenId}
                    pricePerShare={parseUnits(pricePerShare.toFixed(6), 6)}
                    availableShares={availableShares}
                  />
                </div>
              )}

              {/* Fully Funded Message */}
              {availableShares <= 0n && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="p-4 glass-card rounded-lg text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Fully Funded</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      All shares for this property have been sold. Check the secondary marketplace for available listings.
                    </p>
                    <Link 
                      href="/marketplace" 
                      className="inline-block btn-secondary text-sm"
                    >
                      View Marketplace
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


