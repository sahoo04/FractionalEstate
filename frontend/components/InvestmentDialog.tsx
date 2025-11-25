'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/contracts'
import { X, Check, Loader2, AlertCircle, TrendingUp, DollarSign } from 'lucide-react'
import { logger } from '@/lib/logger'

// ERC20 ABI for USDC approve function
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

const PROPERTY_SHARE_ABI = [
  {
    name: 'purchaseShares',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'getProperty',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'location', type: 'string' },
          { name: 'totalShares', type: 'uint256' },
          { name: 'pricePerShare', type: 'uint256' },
          { name: 'seller', type: 'address' },
          { name: 'exists', type: 'bool' }
        ]
      }
    ]
  }
] as const

interface InvestmentDialogProps {
  isOpen: boolean
  onClose: () => void
  propertyId: number
  propertyName: string
  pricePerShare: number
  availableShares: number
  onSuccess?: () => void
}

type InvestmentStep = 'input' | 'approve' | 'approving' | 'purchase' | 'purchasing' | 'success' | 'error'

export function InvestmentDialog({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  pricePerShare,
  availableShares,
  onSuccess
}: InvestmentDialogProps) {
  const { address } = useAccount()
  const [step, setStep] = useState<InvestmentStep>('input')
  const [sharesToBuy, setSharesToBuy] = useState(10)
  const [errorMessage, setErrorMessage] = useState('')
  
  const totalCost = sharesToBuy * pricePerShare
  const totalCostInUSDC = parseUnits(totalCost.toString(), 6) // USDC has 6 decimals

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // Check USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.PropertyShare1155] : undefined,
    query: { enabled: !!address }
  })

  // Check if property exists on-chain
  const { data: propertyData, isLoading: isLoadingProperty } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_ABI,
    functionName: 'getProperty',
    args: [BigInt(propertyId)],
    query: { enabled: !!propertyId && propertyId > 0 }
  })

  const propertyExists = propertyData ? (propertyData as any)?.exists === true : false

  const hasEnoughBalance = usdcBalance ? usdcBalance >= totalCostInUSDC : false
  // Always check allowance against required cost
  const hasEnoughAllowance = allowance !== undefined && BigInt(allowance) >= BigInt(totalCostInUSDC)

  // Approve USDC
  const { 
    writeContract: approveUSDC, 
    data: approveHash,
    isPending: isApprovePending,
    error: approveError
  } = useWriteContract()

  const { 
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess 
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Purchase shares
  const { 
    writeContract: purchaseShares,
    data: purchaseHash,
    isPending: isPurchasePending,
    error: purchaseError
  } = useWriteContract()

  const { 
    isLoading: isPurchaseConfirming,
    isSuccess: isPurchaseSuccess 
  } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  })

  const notifyBackend = async () => {
    const response = await fetch('/api/transactions/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_hash: purchaseHash,
        from_address: address,
        to_address: CONTRACTS.PropertyShare1155,
        property_token_id: propertyId,
        amount: totalCost,
        share_quantity: sharesToBuy,
        transaction_type: 'SHARE_PURCHASE'
      })
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to log transaction')
    }
    logger.info('Transaction logged to backend')
  }

  // Handle step transitions
  useEffect(() => {
    if (step === 'approving' && isApproveSuccess) {
      logger.info('USDC approved successfully')
      refetchAllowance()
      setStep('purchase')
    }
    // Refetch allowance after purchase to keep state fresh
    if (step === 'purchasing' && isPurchaseSuccess) {
      refetchAllowance()
    }
  }, [isApproveSuccess, step, refetchAllowance])

  useEffect(() => {
    if (step === 'purchasing' && isPurchaseSuccess) {
      const handleSuccess = async () => {
        logger.info('Shares purchased successfully')
        try {
          await notifyBackend()
          setStep('success')
          if (onSuccess) {
            setTimeout(() => onSuccess(), 2000)
          }
        } catch (error: any) {
          logger.error('Failed to notify backend', error)
          setErrorMessage(error.message || 'Transaction successful but failed to update database. Please contact support.')
          setStep('error')
        }
      }
      handleSuccess()
    }
  }, [isPurchaseSuccess, step, onSuccess])

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setErrorMessage(approveError.message)
      setStep('error')
    }
  }, [approveError])

  useEffect(() => {
    if (purchaseError) {
      setErrorMessage(purchaseError.message)
      setStep('error')
    }
  }, [purchaseError])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('input')
        setSharesToBuy(10)
        setErrorMessage('')
      }, 300)
    }
  }, [isOpen])

  const handleApprove = async () => {
    try {
      setStep('approving')
      await approveUSDC({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PropertyShare1155, totalCostInUSDC]
      })
    } catch (error: any) {
      logger.error('Approval failed', error)
      setErrorMessage(error.message || 'Failed to approve USDC')
      setStep('error')
    }
  }

  const handlePurchase = async () => {
    try {
      if (isPurchasePending || isPurchaseConfirming) return // Prevent double buy
      
      // Critical: Check if property exists on-chain before attempting purchase
      if (!propertyExists) {
        setErrorMessage('This property does not exist on the blockchain. This may be due to contract redeployment. Please create a new property or contact support.')
        setStep('error')
        logger.error('Purchase blocked: Property does not exist on-chain', { 
          propertyId, 
          contractAddress: CONTRACTS.PropertyShare1155 
        })
        return
      }

      setStep('purchasing')
      await purchaseShares({
        address: CONTRACTS.PropertyShare1155,
        abi: PROPERTY_SHARE_ABI,
        functionName: 'purchaseShares',
        args: [BigInt(propertyId), BigInt(sharesToBuy)]
      })
    } catch (error: any) {
      logger.error('Purchase failed', error)
      setErrorMessage(error.message || 'Failed to purchase shares')
      setStep('error')
    }
  }

  const handleContinue = () => {
    // Critical: Check if property exists on-chain
    if (!isLoadingProperty && !propertyExists) {
      setErrorMessage('This property does not exist on the blockchain. This may be due to contract redeployment. Please create a new property or contact support.')
      setStep('error')
      logger.error('Purchase blocked: Property does not exist on-chain', { 
        propertyId, 
        contractAddress: CONTRACTS.PropertyShare1155 
      })
      return
    }
    
    if (!hasEnoughBalance) {
      setErrorMessage('Insufficient USDC balance')
      setStep('error')
      return
    }
    if (sharesToBuy > availableShares) {
      setErrorMessage(`Only ${availableShares} shares available`)
      setStep('error')
      return
    }
    // Only ask for approval if allowance is less than required
    if (hasEnoughAllowance) {
      setStep('purchase')
    } else {
      refetchAllowance()
      setStep('approve')
    }
  }

  if (!isOpen) return null

  const formattedBalance = usdcBalance ? formatUnits(usdcBalance, 6) : '0'
  const monthlyEstimatedReturn = (totalCost * 0.008).toFixed(2) // 0.8% monthly

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-web3-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Invest in Property</h2>
              <p className="text-primary-100 text-sm mt-1">{propertyName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Step: Input Amount */}
          {step === 'input' && (
            <div className="space-y-6">
              {/* Balance Display */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Your USDC Balance</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">${parseFloat(formattedBalance).toLocaleString()}</span>
                </div>
              </div>

              {/* Shares Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Number of Shares
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={availableShares}
                    value={sharesToBuy}
                    onChange={(e) => setSharesToBuy(Math.max(1, Math.min(availableShares, parseInt(e.target.value) || 1)))}
                    className="w-full px-4 py-4 text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    of {availableShares.toLocaleString()}
                  </div>
                </div>
                
                {/* Quick Select Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSharesToBuy(Math.min(amount, availableShares))}
                      className="py-2 px-3 text-sm font-semibold border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price per Share</span>
                  <span className="font-semibold text-gray-900">${pricePerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Shares</span>
                  <span className="font-semibold text-gray-900">×{sharesToBuy}</span>
                </div>
                <div className="border-t-2 border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Cost</span>
                  <span className="text-2xl font-bold text-primary-600">${totalCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Expected Returns */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Expected Returns</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Monthly (est.)</span>
                        <span className="font-bold text-green-700">~${monthlyEstimatedReturn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual ROI</span>
                        <span className="font-bold text-green-700">~9.6%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Existence Warning */}
              {!isLoadingProperty && !propertyExists && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 mb-1">⚠️ Property Not Found on Blockchain</p>
                      <p className="text-xs text-red-700">
                        This property (ID: {propertyId}) does not exist on the deployed contract. 
                        This usually happens after contract redeployment. Please create a new property.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!hasEnoughBalance || sharesToBuy < 1 || sharesToBuy > availableShares || (!isLoadingProperty && !propertyExists)}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-web3-600 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
              >
                Continue to {hasEnoughAllowance ? 'Purchase' : 'Approval'}
              </button>

              {!hasEnoughBalance && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Insufficient USDC balance. You need ${totalCost.toFixed(2)} USDC.</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Approve USDC */}
          {step === 'approve' && (
            <div className="space-y-6 text-center py-8">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                <DollarSign className="w-10 h-10 text-primary-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Approve USDC</h3>
                <p className="text-gray-600">
                  First, you need to approve the contract to spend ${totalCost.toFixed(2)} USDC on your behalf.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-left">
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Amount to approve:</span>
                    <span className="font-bold">${totalCost.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contract:</span>
                    <span className="font-mono text-xs">{CONTRACTS.PropertyShare1155.slice(0, 10)}...</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleApprove}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-web3-600 text-white font-bold rounded-xl hover:shadow-lg transition-all text-lg"
              >
                Approve USDC
              </button>
            </div>
          )}

          {/* Step: Approving */}
          {step === 'approving' && (
            <div className="space-y-6 text-center py-12">
              <div className="relative">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Approving USDC...</h3>
                <p className="text-gray-600">Please confirm the transaction in your wallet.</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments.</p>
              </div>
              {isApproveConfirming && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  ⛓️ Transaction submitted. Waiting for confirmation...
                </div>
              )}
            </div>
          )}

          {/* Step: Purchase */}
          {step === 'purchase' && (
            <div className="space-y-6 text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Invest!</h3>
                <p className="text-gray-600">
                  USDC approved. Now purchase {sharesToBuy} shares for ${totalCost.toFixed(2)}.
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-primary-50 to-web3-50 rounded-xl border-2 border-primary-200">
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Shares:</span>
                    <span className="font-bold">{sharesToBuy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Investment:</span>
                    <span className="font-bold text-primary-600">${totalCost.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Property:</span>
                    <span className="font-bold text-xs">{propertyName}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handlePurchase}
                disabled={isPurchasePending || isPurchaseConfirming}
                className={`w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all text-lg ${isPurchasePending || isPurchaseConfirming ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isPurchasePending || isPurchaseConfirming ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          )}

          {/* Step: Purchasing */}
          {step === 'purchasing' && (
            <div className="space-y-6 text-center py-12">
              <div className="relative">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Purchase...</h3>
                <p className="text-gray-600">Please confirm the transaction in your wallet.</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments.</p>
              </div>
              {isPurchaseConfirming && (
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  ⛓️ Transaction submitted. Waiting for confirmation...
                </div>
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="space-y-6 text-center py-12">
              <div className="relative">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                  <Check className="w-12 h-12 text-green-600" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-green-400 rounded-full animate-ping opacity-20"></div>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">🎉 Success!</h3>
                <p className="text-gray-600 text-lg">
                  You now own {sharesToBuy} shares of {propertyName}!
                </p>
              </div>
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                <div className="text-sm text-gray-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Shares Purchased:</span>
                    <span className="font-bold text-lg">{sharesToBuy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Invested:</span>
                    <span className="font-bold text-lg text-green-600">${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-green-200">
                    <span>Est. Monthly Returns:</span>
                    <span className="font-bold text-green-700">~${monthlyEstimatedReturn}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-web3-600 text-white font-bold rounded-xl hover:shadow-lg transition-all text-lg"
              >
                View Portfolio
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="space-y-6 text-center py-12">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Transaction Failed</h3>
                <p className="text-gray-600 text-sm">
                  {errorMessage || 'An error occurred. Please try again.'}
                </p>
              </div>
              <button
                onClick={() => setStep('input')}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-web3-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
