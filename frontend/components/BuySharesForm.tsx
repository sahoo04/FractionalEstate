'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI, USDC_ABI } from '@/lib/contracts'
import { parseUnits, formatUnits } from 'viem'
import { useState } from 'react'
import { logger } from '@/lib/logger'

interface BuySharesFormProps {
  tokenId: number
  pricePerShare: bigint
  availableShares: bigint
}

export function BuySharesForm({ tokenId, pricePerShare, availableShares }: BuySharesFormProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('10')
  const [actionType, setActionType] = useState<'approve' | 'buy' | null>(null)
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACTS.PropertyShare1155],
    query: {
      enabled: !!address,
      refetchInterval: isConfirming ? 1000 : false, // Refetch every second while confirming
    },
  })

  // Check property count to verify tokenId is valid
  const { data: propertyCount } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'propertyCount',
    query: {
      enabled: true,
    },
  })

  // Property exists if tokenId is > 0 and <= propertyCount
  const propertyExists = propertyCount 
    ? BigInt(tokenId) > 0n && BigInt(tokenId) <= (propertyCount as bigint)
    : false

  const handleApprove = async () => {
    if (!address) return

    const shares = BigInt(parseInt(amount))
    const totalPrice = pricePerShare * shares
    
    // Approve with a large allowance (total price * 2 for safety)
    const amountToApprove = totalPrice * 2n
    
    try {
      setActionType('approve')
      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PropertyShare1155, amountToApprove],
      })
    } catch (error) {
      logger.error('Error approving USDC', error, { 
        tokenId, 
        amount, 
        address 
      })
      setActionType(null)
    }
  }

  const handleBuy = async () => {
    if (!address || !amount) return

    const shares = BigInt(parseInt(amount))
    const totalPrice = pricePerShare * shares

    // Validation checks before purchase
    if (usdcBalance && (usdcBalance as bigint) < totalPrice) {
      alert('❌ Insufficient USDC balance')
      return
    }

    if (allowance && (allowance as bigint) < totalPrice) {
      alert('❌ Insufficient USDC allowance. Please approve first.')
      return
    }

    if (shares > availableShares) {
      alert('❌ Requested shares exceed available shares')
      return
    }

    try {
      setActionType('buy')
      logger.info('Purchasing shares directly', { 
        tokenId, 
        shares: shares.toString(), 
        totalPrice: totalPrice.toString(),
        allowance: allowance?.toString(),
        balance: usdcBalance?.toString()
      })
      
      // Call purchaseShares function - buyer pays with USDC directly
      writeContract({
        address: CONTRACTS.PropertyShare1155,
        abi: PROPERTY_SHARE_1155_ABI,
        functionName: 'purchaseShares',
        args: [BigInt(tokenId), shares],
      })
    } catch (error) {
      logger.error('Error purchasing shares', error, { 
        tokenId, 
        shares: shares.toString(), 
        totalPrice: totalPrice.toString(),
        address 
      })
      alert('❌ Error purchasing shares. Please check console for details.')
      setActionType(null)
    }
  }

  // Log transaction and reset action type when transaction succeeds
  if (isSuccess && actionType === 'buy' && hash) {
    // Log transaction to database
    const logTransaction = async () => {
      try {
        const shares = BigInt(parseInt(amount))
        const totalPrice = pricePerShare * shares
        
        await fetch('/api/transactions/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_hash: hash,
            from_address: address,
            to_address: CONTRACTS.PropertyShare1155,
            property_token_id: tokenId.toString(),
            amount: totalPrice.toString(),
            share_quantity: parseInt(amount),
            transaction_type: 'SHARE_PURCHASE',
          }),
        })
        
        logger.info('Transaction logged', { hash, tokenId, shares: amount })
      } catch (error) {
        logger.error('Failed to log transaction', error, { hash, tokenId })
      }
    }
    
    logTransaction()
    
    setTimeout(() => {
      setActionType(null)
      setAmount('10')
      window.location.reload() // Reload to update balances and portfolio
    }, 3000)
  }

  // Reset action type and refetch allowance when transaction succeeds
  if (isSuccess && actionType === 'approve') {
    setTimeout(() => {
      setActionType(null)
      refetchAllowance()
    }, 2000)
  }

  const shares = amount ? BigInt(parseInt(amount)) : 0n
  const totalPrice = shares * pricePerShare
  const totalPriceFormatted = Number(totalPrice) / 1e6
  const pricePerShareFormatted = Number(pricePerShare) / 1e6
  const usdcBalanceFormatted = usdcBalance ? Number(usdcBalance as bigint) / 1e6 : 0
  const allowanceValue = allowance as bigint | undefined
  const needsApproval = allowanceValue ? allowanceValue < totalPrice : true

  // Check if property is fully sold
  const isFullySold = availableShares <= 0n

  if (!address) {
    return (
      <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-600 mb-4">Connect your wallet to invest</p>
      </div>
    )
  }

  // Show message if property is fully sold
  if (isFullySold) {
    return (
      <div className="animate-fade-in">
        <div className="p-6 glass-card rounded-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Property Fully Funded</h3>
          <p className="text-gray-600 mb-4">
            All shares for this property have been sold. Check the secondary marketplace for available listings.
          </p>
          <a 
            href="/marketplace" 
            className="inline-block btn-secondary"
          >
            View Marketplace
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Number of Shares Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-300">
          Number of Shares
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            const value = e.target.value
            const numValue = parseInt(value)
            // Validate: must be positive and not exceed available shares
            if (value === '' || (numValue > 0 && numValue <= Number(availableShares))) {
              setAmount(value)
            } else if (numValue > Number(availableShares)) {
              // Set to max available if user tries to exceed
              setAmount(Number(availableShares).toString())
            }
          }}
          min="1"
          max={Number(availableShares)}
          className="input-field glass-input"
          placeholder="Enter amount"
          disabled={isFullySold}
        />
        <p className="text-sm text-gray-500 mt-1">
          Available: {Number(availableShares).toLocaleString()} shares
        </p>
      </div>

      {/* Investment Breakdown */}
      {amount && (
        <div className="mb-6 p-4 glass-card rounded-lg space-y-3 transition-all duration-300 hover:bg-white/80 animate-slide-up">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price per Share</span>
            <span className="font-semibold">${pricePerShareFormatted.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Number of Shares</span>
            <span className="font-semibold">{amount}</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="font-bold text-gray-700">Total USDC Required</span>
            <span className="font-bold text-blue-600 text-lg">${totalPriceFormatted.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-gray-500">Your USDC Balance</span>
            <span className={usdcBalanceFormatted < totalPriceFormatted ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              ${usdcBalanceFormatted.toFixed(2)} USDC
            </span>
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">ℹ️ Gas Fees:</span> Network gas fees will be paid separately in ETH/ARB (usually $0.10-$0.50). Make sure you have some ETH in your wallet.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!propertyExists && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
          <p className="text-sm text-red-700">This property is not tokenized on-chain (tokenId {tokenId}). Purchases are disabled to prevent failed transactions and excessive gas estimates.</p>
        </div>
      )}
      
      {/* Debug Info - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg mb-3 text-xs">
          <p><strong>Debug Info:</strong></p>
          <p>Property Exists: {propertyExists ? '✓ Yes' : '✗ No'}</p>
          <p>Property Count: {propertyCount?.toString() || 'Loading...'}</p>
          <p>Token ID: {tokenId}</p>
          <p>Needs Approval: {needsApproval ? 'Yes' : 'No'}</p>
          <p>Allowance: {allowance ? `${Number(allowance as bigint) / 1e6} USDC` : '0 USDC'}</p>
          <p>Required: ${totalPriceFormatted.toFixed(2)} USDC</p>
        </div>
      )}
      
      {needsApproval && amount && propertyExists && !isFullySold ? (
        <>
          <button
            onClick={handleApprove}
            disabled={!amount || isPending || isConfirming || usdcBalanceFormatted < totalPriceFormatted || isFullySold}
            className="w-full btn-primary py-4 text-lg mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {actionType === 'approve' ? 'Approving...' : 'Processing...'}
              </span>
            ) : 'Approve USDC'}
          </button>
          {isSuccess && actionType === 'approve' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
              <p className="text-sm text-green-700 font-semibold">✓ USDC Approved! Now you can invest.</p>
            </div>
          )}
        </>
      ) : null}
      
      <button
        onClick={handleBuy}
        disabled={!amount || needsApproval || isPending || isConfirming || usdcBalanceFormatted < totalPriceFormatted || !propertyExists || isFullySold}
        className="w-full btn-primary py-4 text-lg mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Purchasing...
          </span>
        ) : 'Invest Now'}
      </button>
      
      {usdcBalanceFormatted < totalPriceFormatted && amount && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
          <p className="text-sm text-red-700">Insufficient USDC balance. You need ${totalPriceFormatted.toFixed(2)} USDC.</p>
        </div>
      )}
      
      {isSuccess && actionType === 'buy' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
          <p className="text-sm text-green-700 font-semibold">✓ Purchase successful! You now own {amount} shares.</p>
        </div>
      )}
      
      <p className="text-xs text-gray-500 text-center">
        By investing, you agree to our Terms of Service and understand the risks involved in real estate investment.
      </p>
    </div>
  )
}


