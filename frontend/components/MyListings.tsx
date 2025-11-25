'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, MARKETPLACE_ABI, OLD_MARKETPLACE_ADDRESS } from '@/lib/contracts'
import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { Store, MapPin, TrendingUp, Calendar, DollarSign, Package, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface MyListingsProps {
  onUpdate?: () => void
}

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

export function MyListings({ onUpdate }: MyListingsProps) {
  const { address } = useAccount()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Fetch user's listings
  useEffect(() => {
    if (!address) return

    const fetchMyListings = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/marketplace/listings')
        if (response.ok) {
          const data = await response.json()
          if (data.success !== false && Array.isArray(data.listings)) {
            // Filter to only user's listings
            const myListings = data.listings.filter(
              (listing: Listing) => listing.sellerWallet.toLowerCase() === address.toLowerCase()
            )
            setListings(myListings)
          } else {
            logger.error('API returned error', undefined, { error: data.error })
            setListings([])
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          logger.error('Failed to fetch listings', undefined, { status: response.status, error: errorData })
          setListings([])
        }
      } catch (error) {
        logger.error('Error fetching my listings', error)
        setListings([])
      } finally {
        setLoading(false)
      }
    }

    fetchMyListings()
  }, [address])

  // Refetch after successful cancellation
  useEffect(() => {
    if (isSuccess && selectedListingId) {
      setTimeout(async () => {
        // Update database status
        try {
          await fetch('/api/marketplace/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId: selectedListingId })
          })
        } catch (error) {
          logger.error('Error updating cancelled listing in database', error)
        }

        // Refetch listings
        const response = await fetch('/api/marketplace/listings')
        if (response.ok) {
          const data = await response.json()
          const myListings = data.listings.filter(
            (listing: Listing) => listing.sellerWallet.toLowerCase() === address!.toLowerCase()
          )
          setListings(myListings)
        }
        
        setSelectedListingId(null)
        onUpdate?.()
      }, 2000)
    }
  }, [isSuccess, selectedListingId, address, onUpdate])

  const handleCancelListing = async (listingId: number, listingCreatedAt?: string) => {
    if (!address) return

    try {
      setSelectedListingId(listingId)
      
      // Determine which contract to use based on listing creation date
      // Old contract was deployed before Nov 24, 2025
      // New contract deployed on Nov 24, 2025
      const oldContractCutoffDate = new Date('2025-11-24T00:00:00Z')
      const listingDate = listingCreatedAt ? new Date(listingCreatedAt) : new Date()
      const useOldContract = listingDate < oldContractCutoffDate

      const contractAddress = useOldContract ? OLD_MARKETPLACE_ADDRESS : CONTRACTS.Marketplace

      writeContract({
        address: contractAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'cancelListing',
        args: [BigInt(listingId)],
      })
    } catch (error) {
      logger.error('Error cancelling listing', error)
      setSelectedListingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <p className="text-gray-600 mt-6 text-base font-medium">Loading your listings...</p>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800 p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDEyOCwgOTAsIDIxMywgMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg mb-6">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Active Listings</h3>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            You haven't listed any shares for sale yet. List your shares from your portfolio to start selling!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {listings.map((listing) => {
        const pricePerShare = parseFloat(listing.pricePerShare)
        const totalPrice = parseFloat(listing.totalPrice)
        const isProcessing = isPending || isConfirming
        const isThisListing = selectedListingId === listing.listingId
        
        // Check if this is an old listing (from old contract)
        const oldContractCutoffDate = new Date('2025-11-24T00:00:00Z')
        const listingDate = new Date(listing.createdAt)
        const isOldListing = listingDate < oldContractCutoffDate

        return (
          <div 
            key={listing.id} 
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 overflow-hidden hover:shadow-2xl"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {listing.propertyName}
                    </h3>
                    {isOldListing && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                        Old Contract
                      </span>
                    )}
                    {listing.property?.propertyType && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm">
                        {listing.property.propertyType}
                      </span>
                    )}
                  </div>

                  {listing.property?.location && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 ml-12">
                      <MapPin className="w-4 h-4 mr-1.5" />
                      {listing.property.location}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleCancelListing(listing.listingId, listing.createdAt)}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing && isThisListing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isConfirming ? 'Confirming...' : 'Cancelling...'}
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Cancel Listing
                    </>
                  )}
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Shares</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Number(listing.sharesAmount).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Price/Share</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${pricePerShare.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Value</div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${totalPrice.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Listed</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Fee Info */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                    <strong>After sale:</strong> You'll receive <span className="font-bold">${(totalPrice * 0.975).toFixed(2)} USDC</span>
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    2.5% marketplace fee (${(totalPrice * 0.025).toFixed(2)}) deducted from total
                  </p>
                </div>
              </div>

              {/* Success Message */}
              {isSuccess && isThisListing && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    Listing cancelled successfully! Shares returned to your wallet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
