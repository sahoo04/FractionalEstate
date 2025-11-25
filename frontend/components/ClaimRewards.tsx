'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { logger } from '@/lib/logger'

interface ClaimRewardsProps {
  tokenId: number
}

export function ClaimRewards({ tokenId }: ClaimRewardsProps) {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: claimableAmount } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'getClaimableAmount',
    args: [BigInt(tokenId), address!],
    query: {
      enabled: !!address,
    },
  })

  const handleClaim = async () => {
    if (!address) return

    try {
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: 'claim',
        args: [BigInt(tokenId)],
      })
    } catch (error) {
      logger.error('Error claiming rewards', error, { 
        tokenId, 
        address 
      })
    }
  }

  const claimable = claimableAmount ? Number(claimableAmount) / 1e6 : 0
  const claimableInr = claimable * 100 // Convert USDC to INR equivalent

  if (!address) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-gray-500 text-sm text-center">Connect wallet to view rewards</p>
      </div>
    )
  }

  if (claimable === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="text-center mb-3">
          <div className="text-xs text-gray-600 mb-1">Claimable Rewards</div>
          <div className="text-xl font-bold text-gray-400">₹0.00</div>
        </div>
        <button 
          disabled 
          className="w-full py-2 px-4 rounded-md bg-gray-200 text-gray-400 font-medium cursor-not-allowed text-sm"
        >
          No Rewards Available
        </button>
      </div>
    )
  }

  return (
    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
      <div className="text-center mb-3">
        <div className="text-xs text-gray-600 mb-1">Claimable Rewards</div>
        <div className="text-2xl font-bold text-green-600">
          ₹{claimableInr.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">
          ${claimable.toFixed(2)} USDC
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={isPending || isConfirming || isSuccess}
        className={`w-full py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center text-sm ${
          isPending || isConfirming
            ? 'bg-green-400 text-white cursor-wait'
            : isSuccess
            ? 'bg-green-600 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isPending || isConfirming ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isPending ? 'Confirming...' : 'Processing...'}
          </>
        ) : isSuccess ? (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Claimed!
          </>
        ) : (
          'Claim Rewards'
        )}
      </button>

      {hash && (
        <div className="mt-2 text-xs text-gray-600 text-center">
          <a 
            href={`https://sepolia.arbiscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            View on Explorer ↗
          </a>
        </div>
      )}
    </div>
  )
}


