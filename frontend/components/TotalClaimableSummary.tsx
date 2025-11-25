'use client'

import React from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, REVENUE_SPLITTER_ABI } from '@/lib/contracts'

interface TotalClaimableSummaryProps {
  tokenIds: number[]
}

export function TotalClaimableSummary({ tokenIds }: TotalClaimableSummaryProps) {
  const { address } = useAccount()
  const [totalClaimable, setTotalClaimable] = React.useState(0)
  const [totalPending, setTotalPending] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!address || tokenIds.length === 0) {
      setIsLoading(false)
      return
    }

    const fetchAllAmounts = async () => {
      setIsLoading(true)
      try {
        let claimableSum = 0
        let pendingSum = 0

        for (const tokenId of tokenIds) {
          // Fetch claimable amount
          const claimableResponse = await fetch(
            `/api/contract-read?contract=RevenueSplitter&function=getClaimableAmount&args=${tokenId},${address}`
          )
          if (claimableResponse.ok) {
            const claimableData = await claimableResponse.json()
            if (claimableData.result) {
              claimableSum += parseFloat(formatUnits(BigInt(claimableData.result), 6))
            }
          }

          // Fetch pending distribution
          const pendingResponse = await fetch(
            `/api/contract-read?contract=RevenueSplitter&function=getPendingDistribution&args=${tokenId}`
          )
          if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json()
            if (pendingData.result) {
              pendingSum += parseFloat(formatUnits(BigInt(pendingData.result), 6))
            }
          }
        }

        setTotalClaimable(claimableSum)
        setTotalPending(pendingSum)
      } catch (error) {
        console.error('Error fetching amounts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllAmounts()
  }, [address, tokenIds])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-green-200 dark:bg-green-800 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-green-200 dark:bg-green-800 rounded w-3/4"></div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-yellow-200 dark:bg-yellow-800 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-yellow-200 dark:bg-yellow-800 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Total Claimable */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
            Total Claimable Now
          </h3>
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-green-700 dark:text-green-300">
          ${totalClaimable.toFixed(2)}
        </div>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
          Across {tokenIds.length} {tokenIds.length === 1 ? 'property' : 'properties'}
        </p>
      </div>

      {/* Total Pending */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Pending Admin Approval
          </h3>
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
          ${totalPending.toFixed(2)}
        </div>
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
          Will be available after approval
        </p>
      </div>
    </div>
  )
}
