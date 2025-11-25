'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, REVENUE_SPLITTER_ABI, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { Loader2, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { getImageUrl } from '@/lib/image-utils'
import { CreateListingForm } from '@/components/CreateListingForm'

interface PropertyCardProps {
  item: {
    token_id: number
    shares: number
    total_invested: string
    current_value: string
    property?: {
      name?: string
      location?: string
      images?: string[]
    }
  }
}

export function PortfolioPropertyCard({ item }: PropertyCardProps) {
  const { address } = useAccount()
  const [isClaimingThis, setIsClaimingThis] = useState(false)

  // Read user's balance of this property shares
  const { data: userBalance } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'balanceOf',
    args: address ? [address, BigInt(item.token_id)] : undefined,
  })

  // Read claimable amount for this specific property
  const { data: claimableAmount, refetch: refetchClaimable } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'getClaimableAmount',
    args: address ? [BigInt(item.token_id), address] : undefined,
  })

  // Read pending distribution (not yet approved by admin)
  const { data: pendingDistribution } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'getPendingDistribution',
    args: [BigInt(item.token_id)],
  })

  // Read total deposited for this property
  const { data: totalDeposited } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'totalDeposited',
    args: [BigInt(item.token_id)],
  })

  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Refetch claimable amount after successful claim
  useEffect(() => {
    if (isTxSuccess) {
      refetchClaimable()
      setIsClaimingThis(false)
    }
  }, [isTxSuccess, refetchClaimable])

  const handleClaim = async () => {
    if (!address || !claimableAmount || claimableAmount === BigInt(0)) return

    try {
      setIsClaimingThis(true)
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: 'claim',
        args: [BigInt(item.token_id)],
      })
    } catch (error) {
      console.error('Claim error:', error)
      setIsClaimingThis(false)
    }
  }

  const claimableUSDC = claimableAmount ? parseFloat(formatUnits(claimableAmount, 6)) : 0
  const pendingUSDC = pendingDistribution ? parseFloat(formatUnits(pendingDistribution, 6)) : 0
  const totalDepositedUSDC = totalDeposited ? parseFloat(formatUnits(totalDeposited, 6)) : 0
  
  // Use database value directly - it's already synced with blockchain
  const actualShares = item.shares

  return (
    <div className="glass-card rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02] group">
      {/* Property Image */}
      <Link href={`/property/${item.token_id}`}>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 relative cursor-pointer">
          {item.property?.images?.[0] && getImageUrl(item.property.images[0]) ? (
            <img 
              src={getImageUrl(item.property.images[0])} 
              alt={item.property?.name || 'Property'}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          {(!item.property?.images?.[0] || !getImageUrl(item.property.images[0])) && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          
          {/* Badge for claimable rewards */}
          {claimableUSDC > 0 && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 animate-pulse-slow shadow-lg">
              <DollarSign className="h-3 w-3" />
              ${claimableUSDC.toFixed(2)}
            </div>
          )}
        </div>
      </Link>

      {/* Property Info */}
      <div className="p-4 space-y-4">
        <Link href={`/property/${item.token_id}`} className="block hover:text-primary-600 transition-all duration-300">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 transition-colors duration-300 group-hover:text-primary-600">
            {item.property?.name || `Property #${item.token_id}`}
          </h3>
          {item.property?.location && (
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">{item.property.location}</p>
          )}
        </Link>

        {/* Investment Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Shares Owned:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {actualShares}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Invested:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${parseFloat(item.total_invested).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Value:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${parseFloat(item.current_value).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Revenue Info */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Claimable Now:</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              ${claimableUSDC.toFixed(2)}
            </span>
          </div>
          
          {pendingUSDC > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Pending Approval:</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                ${pendingUSDC.toFixed(2)}
              </span>
            </div>
          )}

          {totalDepositedUSDC > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ${totalDepositedUSDC.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Claim Button */}
        {claimableUSDC > 0 && (
          <button
            onClick={handleClaim}
            disabled={isClaimingThis || isTxPending}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 font-medium"
          >
            {isClaimingThis || isTxPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Claim ${claimableUSDC.toFixed(2)}
              </>
            )}
          </button>
        )}

        {claimableUSDC === 0 && pendingUSDC > 0 && (
          <div className="w-full px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              💰 ${pendingUSDC.toFixed(2)} pending admin approval
            </p>
          </div>
        )}

        {claimableUSDC === 0 && pendingUSDC === 0 && totalDepositedUSDC === 0 && (
          <div className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No revenue distributed yet
            </p>
          </div>
        )}

        {/* List for Sale Button */}
        {userBalance && userBalance > BigInt(0) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <CreateListingForm 
              tokenId={item.token_id}
              propertyName={item.property?.name || `Property #${item.token_id}`}
              userBalance={userBalance}
            />
          </div>
        )}
      </div>
    </div>
  )
}
