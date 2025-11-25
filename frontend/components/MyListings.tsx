'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, MARKETPLACE_ABI } from '@/lib/contracts'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

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
          // Filter to only user's listings
          const myListings = data.listings.filter(
            (listing: Listing) => listing.sellerWallet.toLowerCase() === address.toLowerCase()
          )
          setListings(myListings)
        }
      } catch (error) {
        console.error('Error fetching my listings:', error)
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

  const handleCancelListing = async (listingId: number) => {
    if (!address) return

    try {
      setSelectedListingId(listingId)
      
      logger.info('Cancelling marketplace listing', { listingId })

      writeContract({
        address: CONTRACTS.Marketplace,
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
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-600 mt-2 text-sm">Loading your listings...</p>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <Card className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active Listings</h3>
        <p className="text-sm text-gray-600">
          You haven't listed any shares for sale yet
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {listings.map((listing) => {
        const pricePerShare = parseFloat(listing.pricePerShare)
        const totalPrice = parseFloat(listing.totalPrice)
        const isProcessing = isPending || isConfirming
        const isThisListing = selectedListingId === listing.listingId

        return (
          <Card key={listing.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {listing.propertyName}
                  </h3>
                  {listing.property?.propertyType && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700">
                      {listing.property.propertyType}
                    </span>
                  )}
                </div>

                {listing.property?.location && (
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {listing.property.location}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs mb-0.5">Shares</div>
                    <div className="font-semibold text-gray-900">
                      {Number(listing.sharesAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-0.5">Price/Share</div>
                    <div className="font-semibold text-gray-900">
                      ${pricePerShare.toLocaleString()} USDC
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-0.5">Total Value</div>
                    <div className="font-semibold text-green-600">
                      ${totalPrice.toLocaleString()} USDC
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-0.5">Listed</div>
                    <div className="text-gray-700 text-xs">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                  💡 <strong>After sale:</strong> You'll receive ${(totalPrice * 0.975).toFixed(2)} USDC (2.5% marketplace fee deducted)
                </div>
              </div>

              <div className="ml-4">
                <Button
                  onClick={() => handleCancelListing(listing.listingId)}
                  disabled={isProcessing}
                  className="whitespace-nowrap border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {isProcessing && isThisListing
                    ? isConfirming
                      ? 'Confirming...'
                      : 'Cancelling...'
                    : 'Cancel Listing'}
                </Button>
              </div>
            </div>

            {isSuccess && isThisListing && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✓ Listing cancelled successfully! Shares returned to your wallet.
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
