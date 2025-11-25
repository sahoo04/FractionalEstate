'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACTS, MARKETPLACE_ABI, USDC_ABI } from '@/lib/contracts'
import { getImageUrl } from '@/lib/image-utils'
import { parseUnits } from 'viem'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MintUSDCButton } from '@/components/MintUSDCButton'
import { MarketplacePurchaseDialog } from '@/components/marketplace/MarketplacePurchaseDialog'
import { AnimatedSection } from '@/components/ui/AnimatedSection'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { useToast } from '@/contexts/ToastContext'
import { logger } from '@/lib/logger'

interface Listing {
  id: string
  listingId: number
  sellerWallet: string
  tokenId: number
  propertyName: string
  sharesAmount: number
  pricePerShare: string
  totalPrice: string
  status: string
  createdAt: string
  property: {
    name: string
    location: string
    images: string[]
    propertyType: string
  } | null
}

export function MarketplaceContent() {
  const { address } = useAccount()
  const { addToast } = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'purchase' | null>(null)
  const processedPurchaseHashRef = useRef<string | null>(null)
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'shares'>('newest')
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Read USDC allowance for Marketplace
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.Marketplace] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Fetch listings from database
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/marketplace/listings')
        if (response.ok) {
          const data = await response.json()
          if (data.success !== false) {
            setListings(data.listings || [])
            setFilteredListings(data.listings || [])
          } else {
            logger.error('API returned error', undefined, { error: data.error })
            setListings([])
            setFilteredListings([])
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          logger.error('Failed to fetch listings', undefined, { status: response.status, error: errorData })
          setListings([])
          setFilteredListings([])
        }
      } catch (error) {
        logger.error('Error fetching listings', error)
        setListings([])
        setFilteredListings([])
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  // Filter and sort listings
  useEffect(() => {
    let filtered = [...listings]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.property?.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return parseFloat(a.pricePerShare) - parseFloat(b.pricePerShare)
        case 'price-high':
          return parseFloat(b.pricePerShare) - parseFloat(a.pricePerShare)
        case 'shares':
          return b.sharesAmount - a.sharesAmount
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    setFilteredListings(filtered)
  }, [listings, searchTerm, sortBy])

  // Refetch listings on successful purchase and update database
  useEffect(() => {
    if (isSuccess && actionType === 'purchase' && selectedListing && hash) {
      // Check if we've already processed this transaction
      if (processedPurchaseHashRef.current === hash) {
        return; // Already processed, skip
      }

      // Mark as processed immediately
      processedPurchaseHashRef.current = hash;

      setTimeout(async () => {
        try {
          // Update database with purchase
          logger.info('Updating database after purchase', {
            listingId: selectedListing.listingId,
            buyer: address,
            hash
          })

          await fetch('/api/marketplace/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listingId: selectedListing.listingId,
              buyerWallet: address,
              sellerWallet: selectedListing.sellerWallet,
              tokenId: selectedListing.tokenId,
              sharesAmount: selectedListing.sharesAmount,
              totalPrice: selectedListing.totalPrice,
              transactionHash: hash
            })
          })

          logger.info('Purchase recorded in database successfully')
          addToast('success', `Successfully purchased ${selectedListing.sharesAmount} shares!`)
        } catch (error) {
          logger.error('Error updating database after purchase', error)
          addToast('error', 'Purchase completed but failed to update records. Please contact support.')
        }

        // Refetch listings
        fetch('/api/marketplace/listings')
          .then(res => res.json())
          .then(data => setListings(data.listings || []))
        
        setSelectedListing(null)
        setActionType(null)
      }, 2000)
    } else if (isSuccess && actionType === 'approve') {
      refetchAllowance()
      setActionType(null)
      addToast('success', 'USDC spending approved! You can now complete your purchase.')
    }
  }, [isSuccess, actionType, selectedListing, address, hash, refetchAllowance, addToast])

  // Reset processed hash when action type changes
  useEffect(() => {
    if (actionType !== 'purchase') {
      processedPurchaseHashRef.current = null;
    }
  }, [actionType])

  const handleApproveUSDC = async (listing: Listing) => {
    if (!address) return

    try {
      setActionType('approve')
      setSelectedListing(listing)
      const totalPrice = parseUnits(listing.totalPrice.toString(), 6)
      
      logger.info('Approving USDC for marketplace purchase', {
        listing: listing.listingId,
        amount: totalPrice.toString()
      })

      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.Marketplace, totalPrice],
      })
    } catch (error) {
      logger.error('Error approving USDC', error)
      addToast('error', 'Failed to approve USDC spending. Please try again.')
      setActionType(null)
    }
  }

  const handlePurchase = async (listing: Listing) => {
    if (!address) return
    setSelectedListing(listing)
    setShowPurchaseDialog(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Header with Gradient */}
      <div className="relative bg-gradient-to-br from-web3-600 via-web3-500 to-primary-500 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')"
          }}
        />
        
        <div className="relative container-app py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <span className="text-2xl">🏪</span>
                <span className="font-semibold">Secondary Marketplace</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                Trade Property Shares
              </h1>
              <p className="text-xl text-white/90 max-w-2xl">
                Buy and sell fractional ownership instantly through our peer-to-peer marketplace
              </p>
            </div>
            
            {address && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-glow min-w-[240px]">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-white/90">Your USDC Balance</span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  ${(Number(usdcBalance || 0n) / 1e6).toFixed(2)}
                </div>
                <div className="text-xs text-white/70 mb-4">
                  Available for purchases
                </div>
                <MintUSDCButton variant="compact" className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search - Modern Design */}
      <div className="container-app py-8">
        <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search by property name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-web3-500 focus:border-web3-500 transition-all duration-200 group-hover:border-gray-300"
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-web3-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="md:w-56">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-web3-500 focus:border-web3-500 appearance-none bg-white cursor-pointer transition-all duration-200 hover:border-gray-300"
                >
                  <option value="newest">🆕 Newest First</option>
                  <option value="price-low">💰 Price: Low → High</option>
                  <option value="price-high">💎 Price: High → Low</option>
                  <option value="shares">📊 Most Shares</option>
                </select>
                <svg className="absolute right-3 top-4 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar - Enhanced Design */}
        {!loading && filteredListings.length > 0 && (
          <div className="bg-gradient-to-br from-primary-50 via-white to-web3-50 rounded-2xl p-6 border-2 border-primary-100 shadow-card mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-3">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">Active Listings</div>
                <div className="text-3xl font-bold text-gray-900">{filteredListings.length}</div>
              </div>
              <div className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-web3-500 to-web3-600 rounded-xl mb-3">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">Total Shares Available</div>
                <div className="text-3xl font-bold text-gray-900">
                  {filteredListings.reduce((sum, l) => sum + l.sharesAmount, 0).toLocaleString()}
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl mb-3">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">Total Market Value</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-success-600 to-success-500 bg-clip-text text-transparent">
                  ${filteredListings.reduce((sum, l) => sum + parseFloat(l.totalPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-16 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              {searchTerm ? 'No Matching Listings Found' : 'No Active Listings Yet'}
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms or browse all available listings'
                : 'Be the first to list your shares for sale and earn from your investment'
              }
            </p>
            <div className="flex gap-4 justify-center">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 bg-gradient-to-r from-web3-600 to-web3-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  Clear Search Filter
                </button>
              )}
              {!searchTerm && (
                <Link href="/dashboard">
                  <Button className="px-6 py-3">Go to Your Dashboard</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredListings.map((listing) => {
            const pricePerShare = parseFloat(listing.pricePerShare)
            const totalPrice = parseFloat(listing.totalPrice)
            const images = listing.property?.images || []
            const propertyImage = images.length > 0 ? getImageUrl(images[0]) : null

            return (
              <div key={listing.id} className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-gray-100">
                {/* Property Image with Overlay */}
                <div className="relative h-56 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                  {propertyImage ? (
                    <>
                      <img 
                        src={propertyImage} 
                        alt={listing.propertyName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {listing.property?.propertyType && (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/95 backdrop-blur-sm text-gray-900 shadow-lg">
                        {listing.property.propertyType}
                      </span>
                    )}
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg">
                      🔥 Listed
                    </span>
                  </div>

                  {/* Location Badge */}
                  {listing.property?.location && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-1.5 text-white bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="text-sm font-medium truncate">{listing.property.location}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Property Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-1">
                    {listing.propertyName}
                  </h3>
                  
                  {/* Seller & Time Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">{listing.sellerWallet.slice(0, 6)}...{listing.sellerWallet.slice(-4)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Listing Stats */}
                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">Shares Available</span>
                      <span className="text-base font-bold text-gray-900">{Number(listing.sharesAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">Price per Share</span>
                      <span className="text-base font-bold text-gray-900">${pricePerShare.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Total Investment Highlight */}
                  <div className="bg-gradient-to-br from-primary-50 to-web3-50 rounded-xl p-4 mb-5 border border-primary-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Total Investment</span>
                      <div className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-web3-600 bg-clip-text text-transparent">
                        ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {listing.sharesAmount} shares × ${pricePerShare.toFixed(2)} USDC
                    </div>
                  </div>

                  {/* Transaction Status Messages */}
                  {selectedListing?.id === listing.id && (
                    <div className="mb-4">
                      {isPending && actionType === 'purchase' && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                          <span className="font-medium">Waiting for wallet confirmation...</span>
                        </div>
                      )}
                      {isConfirming && actionType === 'purchase' && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          <span className="font-medium">Transaction confirming on blockchain...</span>
                        </div>
                      )}
                      {isSuccess && actionType === 'purchase' && (
                        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 rounded-xl text-sm text-success-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-medium">Purchase successful! Updating records...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      href={`/property/${listing.tokenId}?source=marketplace`}
                      className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-center"
                    >
                      View Details
                    </Link>
                    {listing.sellerWallet === address ? (
                      <div className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-500 font-semibold text-center cursor-not-allowed border-2 border-gray-200">
                        Your Listing
                      </div>
                    ) : (
                      <>
                        {!usdcAllowance || usdcAllowance < parseUnits(listing.totalPrice.toString(), 6) ? (
                          <button
                            onClick={() => handleApproveUSDC(listing)}
                            disabled={isPending || isConfirming}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-web3-600 to-web3-500 text-white font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                          >
                            {isPending && actionType === 'approve' && selectedListing?.id === listing.id
                              ? 'Approving...'
                              : '🔓 Approve USDC'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePurchase(listing)}
                            disabled={!address || isPending || isConfirming}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                          >
                            🛒 Buy Now
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* Info Section - Enhanced Design */}
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 hover:-translate-y-1">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">💼</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">How to Sell</h3>
            <p className="text-gray-700 leading-relaxed">
              Visit your dashboard, select any property you own, and create a listing with your desired price
            </p>
          </div>

          <div className="group bg-gradient-to-br from-success-50 to-success-100/50 rounded-2xl p-6 border-2 border-success-200 hover:border-success-300 transition-all duration-300 hover:-translate-y-1">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-success-500 to-success-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Safe & Secure</h3>
            <p className="text-gray-700 leading-relaxed">
              All transactions are executed through audited smart contracts on Arbitrum blockchain
            </p>
          </div>

          <div className="group bg-gradient-to-br from-web3-50 to-web3-100/50 rounded-2xl p-6 border-2 border-web3-200 hover:border-web3-300 transition-all duration-300 hover:-translate-y-1">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-web3-500 to-web3-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Transfer</h3>
            <p className="text-gray-700 leading-relaxed">
              Ownership transfers instantly upon purchase confirmation. No waiting periods
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Dialog */}
      <MarketplacePurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => {
          setShowPurchaseDialog(false)
          setSelectedListing(null)
        }}
        listing={selectedListing}
        onSuccess={async () => {
          // Refetch listings after successful purchase
          try {
            const response = await fetch('/api/marketplace/listings')
            const data = await response.json()
            if (data.success !== false) {
              const updatedListings = data.listings || []
              setListings(updatedListings)
              setFilteredListings(updatedListings)
              
              // Update selectedListing if it still exists in the updated listings
              if (selectedListing) {
                const updatedListing = updatedListings.find(
                  (l: Listing) => l.listingId === selectedListing.listingId
                )
                if (updatedListing) {
                  setSelectedListing(updatedListing)
                } else {
                  // Listing was fully sold or removed, clear selection
                  setSelectedListing(null)
                }
              }
            }
          } catch (error) {
            logger.error('Error refetching listings after purchase', error)
          }
        }}
      />
    </main>
  )
}
