'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACTS, MARKETPLACE_ABI, USDC_ABI } from '@/lib/contracts'
import { getImageUrl } from '@/lib/image-utils'
import { parseUnits } from 'viem'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'purchase' | null>(null)
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
          setListings(data.listings || [])
          setFilteredListings(data.listings || [])
        } else {
          console.error('Failed to fetch listings')
        }
      } catch (error) {
        console.error('Error fetching listings:', error)
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
        } catch (error) {
          logger.error('Error updating database after purchase', error)
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
    }
  }, [isSuccess, actionType, selectedListing, address, hash])

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
      setActionType(null)
    }
  }

  const handlePurchase = async (listing: Listing) => {
    if (!address) return

    const totalPrice = parseUnits(listing.totalPrice.toString(), 6)
    const balance = usdcBalance || BigInt(0)
    const allowance = usdcAllowance || BigInt(0)

    // Debug logging
    logger.info('Purchase check', {
      totalPriceString: listing.totalPrice.toString(),
      totalPriceBigInt: totalPrice.toString(),
      balanceBigInt: balance.toString(),
      balanceFormatted: (Number(balance) / 1e6).toFixed(2),
      allowanceBigInt: allowance.toString(),
      needsApproval: allowance < totalPrice,
      hasEnoughBalance: balance >= totalPrice
    })

    // Check balance
    if (balance < totalPrice) {
      alert(`Insufficient USDC balance. You need ${listing.totalPrice} USDC but only have ${(Number(balance) / 1e6).toFixed(2)} USDC`)
      return
    }

    // Check allowance
    if (allowance < totalPrice) {
      alert('Please approve USDC first')
      return
    }

    try {
      setActionType('purchase')
      setSelectedListing(listing)
      
      logger.info('Purchasing from marketplace', {
        listingId: listing.listingId,
        totalPrice: totalPrice.toString(),
        allowance: allowance.toString()
      })

      writeContract({
        address: CONTRACTS.Marketplace,
        abi: MARKETPLACE_ABI,
        functionName: 'purchase',
        args: [BigInt(listing.listingId)],
      })
    } catch (error) {
      logger.error('Error purchasing listing', error)
      setActionType(null)
    }
  }

  return (
    <main className="container-app py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Secondary Marketplace</h1>
            <p className="text-gray-600">
              Buy and sell property shares from other investors
            </p>
          </div>
          {address && (
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Your USDC Balance</div>
              <div className="text-2xl font-bold text-green-600">
                ${(Number(usdcBalance || 0n) / 1e6).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Available for purchases
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 animate-slide-up">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search properties by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent glass-input transition-all duration-300 focus:shadow-lg"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Sort */}
        <div className="md:w-48">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent glass-input transition-all duration-300 focus:shadow-lg"
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="shares">Most Shares</option>
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      {!loading && filteredListings.length > 0 && (
        <div className="mb-6 p-4 glass-card rounded-lg border border-blue-200/50 animate-slide-up">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="transition-transform duration-300 hover:scale-105">
              <span className="text-gray-600">Total Listings:</span>
              <span className="ml-2 font-semibold text-gray-900">{filteredListings.length}</span>
            </div>
            <div className="transition-transform duration-300 hover:scale-105">
              <span className="text-gray-600">Total Shares Available:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {filteredListings.reduce((sum, l) => sum + l.sharesAmount, 0).toLocaleString()}
              </span>
            </div>
            <div className="transition-transform duration-300 hover:scale-105">
              <span className="text-gray-600">Total Value:</span>
              <span className="ml-2 font-semibold text-green-600">
                ${filteredListings.reduce((sum, l) => sum + parseFloat(l.totalPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Listings */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marketplace listings...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {searchTerm ? 'No Matching Listings' : 'No Active Listings'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try different search terms or clear the search filter'
              : 'Be the first to list your shares for sale from your dashboard'
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Clear Search
            </button>
          )}
          {!searchTerm && (
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing, index) => {
            const pricePerShare = parseFloat(listing.pricePerShare)
            const totalPrice = parseFloat(listing.totalPrice)
            const images = listing.property?.images || []
            const propertyImage = images.length > 0 ? getImageUrl(images[0]) : null

            return (
              <div key={listing.id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
                <Card variant="glass-interactive" className="transition-all duration-300">
                {/* Property Image */}
                {propertyImage && (
                  <div className="h-48 bg-gray-200 relative rounded-t-lg overflow-hidden mb-4">
                    <img 
                      src={propertyImage} 
                      alt={listing.propertyName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    {listing.property?.propertyType && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white">
                          {listing.property.propertyType}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Property Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {listing.propertyName}
                  </h3>
                  {listing.property?.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {listing.property.location}
                    </div>
                  )}
                  
                  {/* Seller Info */}
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Seller: {listing.sellerWallet.slice(0, 6)}...{listing.sellerWallet.slice(-4)}
                  </div>
                  
                  {/* Listed Time */}
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Listed {new Date(listing.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Listing Details */}
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Shares Listed</span>
                    <span className="font-bold text-gray-900">
                      {Number(listing.sharesAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Price per Share</span>
                    <span className="font-bold text-gray-900">
                      ${pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-medium">Total Cost</span>
                    <span className="font-bold text-primary text-base">
                      ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </span>
                  </div>
                </div>

                {/* Total Price */}
                <div className="mb-4 p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-700 font-medium">Your Investment</div>
                    <div className="text-2xl font-bold text-primary">
                      ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {listing.sharesAmount} shares × ${pricePerShare.toFixed(2)}
                  </div>
                  
                  {/* Fee Info */}
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="flex items-start gap-2 text-xs text-gray-700 bg-white/50 p-2 rounded">
                      <span className="font-semibold">💡 Fee Info:</span>
                      <div>
                        <div>• 2.5% marketplace fee deducted from seller</div>
                        <div>• Gas fees (~$0.10-$0.50 in ETH) paid separately</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Status Messages */}
                {selectedListing?.id === listing.id && (
                  <>
                    {isPending && actionType === 'purchase' && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        ⏳ Waiting for wallet confirmation...
                      </div>
                    )}
                    {isConfirming && actionType === 'purchase' && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                        ⏳ Transaction confirming on blockchain...
                      </div>
                    )}
                    {isSuccess && actionType === 'purchase' && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                        ✓ Purchase successful! Updating records...
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    href={`/property/${listing.tokenId}`}
                    className="flex-1 py-2 px-4 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-center"
                  >
                    View Details
                  </Link>
                  {listing.sellerWallet === address ? (
                    <div className="flex-1 py-2 px-4 rounded-md bg-gray-100 text-gray-500 font-medium text-center cursor-not-allowed">
                      Your Listing
                    </div>
                  ) : (
                    <>
                      {/* Check if USDC is approved */}
                      {!usdcAllowance || usdcAllowance < parseUnits(listing.totalPrice.toString(), 6) ? (
                        <Button
                          onClick={() => handleApproveUSDC(listing)}
                          disabled={isPending || isConfirming}
                          className="flex-1"
                        >
                          {isPending && actionType === 'approve' && selectedListing?.id === listing.id
                            ? 'Approving...'
                            : 'Approve USDC'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handlePurchase(listing)}
                          disabled={!address || isPending || isConfirming}
                          className="flex-1"
                        >
                          {isPending && actionType === 'purchase' && selectedListing?.id === listing.id
                            ? 'Buying...'
                            : isConfirming && actionType === 'purchase' && selectedListing?.id === listing.id
                            ? 'Confirming...'
                            : 'Buy Now'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="bg-blue-50/50 transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up stagger-1">
          <h3 className="font-bold text-gray-900 mb-2 transition-colors duration-300">💼 How to Sell</h3>
          <p className="text-sm text-gray-600 transition-colors duration-300">
            Go to your dashboard, select a property, and create a listing
          </p>
        </Card>
        <Card variant="glass" className="bg-green-50/50 transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up stagger-2">
          <h3 className="font-bold text-gray-900 mb-2 transition-colors duration-300">🛡️ Safe & Secure</h3>
          <p className="text-sm text-gray-600 transition-colors duration-300">
            All transactions are executed through smart contracts
          </p>
        </Card>
        <Card variant="glass" className="bg-purple-50/50 transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-slide-up stagger-3">
          <h3 className="font-bold text-gray-900 mb-2 transition-colors duration-300">⚡ Instant Transfer</h3>
          <p className="text-sm text-gray-600 transition-colors duration-300">
            Ownership transfers instantly upon purchase confirmation
          </p>
        </Card>
      </div>
    </main>
  )
}
