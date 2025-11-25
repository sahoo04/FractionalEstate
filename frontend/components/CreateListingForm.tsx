'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACTS, MARKETPLACE_ABI, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { logger } from '@/lib/logger'

interface CreateListingFormProps {
  tokenId: number
  propertyName: string
  userBalance: bigint
  pricePerShareMarket?: number
  onSuccess?: () => void
}

export function CreateListingForm({ 
  tokenId, 
  propertyName,
  userBalance, 
  pricePerShareMarket,
  onSuccess 
}: CreateListingFormProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [pricePerShare, setPricePerShare] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [syncingToDatabase, setSyncingToDatabase] = useState(false)
  
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: isApproved } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'isApprovedForAll',
    args: [address!, CONTRACTS.Marketplace],
    query: {
      enabled: !!address,
    },
  })

  // Read listing count to get the next listingId
  const { data: listingCount, refetch: refetchListingCount } = useReadContract({
    address: CONTRACTS.Marketplace,
    abi: MARKETPLACE_ABI,
    functionName: 'listingCount',
    query: {
      enabled: !!address,
    },
  })

  // Sync to database after successful listing creation
  useEffect(() => {
    if (isSuccess && address && amount && pricePerShare) {
      const syncToDatabase = async () => {
        setSyncingToDatabase(true)
        try {
          // Refetch listingCount to get updated value from blockchain
          const { data: updatedCount } = await refetchListingCount()
          const listingId = Number(updatedCount || 0)

          if (listingId === 0) {
            console.error('❌ Could not get listing ID from blockchain')
            return
          }

          const priceInUsdc = parseFloat(pricePerShare)
          const sharesAmount = parseInt(amount)
          const totalPrice = priceInUsdc * sharesAmount

          console.log('🔄 Syncing listing to database:', {
            listingId,
            tokenId,
            propertyName,
            sharesAmount,
            pricePerShare: priceInUsdc,
            seller: address
          })

          logger.info('Syncing listing to database', {
            listingId,
            tokenId,
            propertyName,
            sharesAmount,
            pricePerShare: priceInUsdc
          })

          const response = await fetch('/api/marketplace/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listingId,
              sellerWallet: address,
              tokenId,
              propertyName,
              sharesAmount,
              pricePerShare: priceInUsdc.toString(),
              totalPrice: totalPrice.toString()
            })
          })

          if (response.ok) {
            const data = await response.json()
            console.log('✅ Listing synced to database successfully:', data)
            logger.info('Listing synced to database successfully')
          } else {
            const errorData = await response.text()
            console.error('❌ Failed to sync listing:', response.status, errorData)
            logger.error('Failed to sync listing to database', { status: response.status, error: errorData })
          }
        } catch (error) {
          console.error('❌ Error syncing listing to database:', error)
          logger.error('Error syncing listing to database', error)
        } finally {
          setSyncingToDatabase(false)
          setTimeout(() => {
            setShowForm(false)
            setAmount('')
            setPricePerShare('')
            onSuccess?.()
          }, 2000)
        }
      }

      // Wait a bit for blockchain to update, then sync
      setTimeout(syncToDatabase, 1000)
    }
  }, [isSuccess, address, amount, pricePerShare, tokenId, propertyName, onSuccess, refetchListingCount])

  const handleApprove = async () => {
    if (!address) return

    try {
      writeContract({
        address: CONTRACTS.PropertyShare1155,
        abi: PROPERTY_SHARE_1155_ABI,
        functionName: 'setApprovalForAll',
        args: [CONTRACTS.Marketplace, true],
      })
    } catch (error) {
      logger.error('Error approving marketplace', error, { tokenId, address })
    }
  }

  const handleCreateListing = async () => {
    if (!address || !amount || !pricePerShare) return

    try {
      // Price per share should be in USDC (6 decimals)
      const priceInUsdc = BigInt(Math.floor(parseFloat(pricePerShare) * 1e6))
      
      writeContract({
        address: CONTRACTS.Marketplace,
        abi: MARKETPLACE_ABI,
        functionName: 'createListing',
        args: [BigInt(tokenId), BigInt(amount), priceInUsdc],
      })
    } catch (error) {
      logger.error('Error creating listing', error, { tokenId, amount, pricePerShare, address })
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
      >
        List for Sale
      </button>
    )
  }

  return (
    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">Create Listing</h4>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Number of Shares (Max: {Number(userBalance)})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={Number(userBalance)}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="10"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Price per Share (USDC)
          </label>
          <input
            type="number"
            value={pricePerShare}
            onChange={(e) => setPricePerShare(e.target.value)}
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="100.00"
          />
        </div>

        {amount && pricePerShare && (
          <div className="p-2 bg-white rounded border border-purple-200">
            <div className="text-xs text-gray-600 mb-1">Total Listing Value</div>
            <div className="text-lg font-bold text-purple-600">
              ₹{((parseFloat(amount) * parseFloat(pricePerShare)) * 100).toLocaleString()}
            </div>
          </div>
        )}

        {!isApproved ? (
          <button
            onClick={handleApprove}
            disabled={isPending || isConfirming}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isPending || isConfirming ? 'Approving...' : 'Approve Marketplace'}
          </button>
        ) : (
          <button
            onClick={handleCreateListing}
            disabled={!amount || !pricePerShare || isPending || isConfirming}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isPending || isConfirming ? 'Creating...' : 'Create Listing'}
          </button>
        )}

        {(isSuccess || syncingToDatabase) && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {syncingToDatabase ? '⏳ Syncing to database...' : '✓ Listing created successfully!'}
          </div>
        )}
      </div>
    </div>
  )
}
