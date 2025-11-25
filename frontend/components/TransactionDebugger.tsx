'use client'

import { useAccount, useBalance, useReadContract } from 'wagmi'
import { CONTRACTS, USDC_ABI, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { formatUnits } from 'viem'

interface TransactionDebuggerProps {
  propertyId?: number
  showWardBoyCheck?: boolean
}

export function TransactionDebugger({ propertyId, showWardBoyCheck }: TransactionDebuggerProps) {
  const { address, chain } = useAccount()

  // Check ETH balance
  const { data: ethBalance } = useBalance({
    address,
  })

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Check USDC allowance for RevenueSplitter
  const { data: usdcAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.RevenueSplitter] : undefined,
  })

  // Check if user is ward boy for the property
  const { data: isWardBoy } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'isPropertyManager',
    args: propertyId && address ? [BigInt(propertyId), address] : undefined,
    query: {
      enabled: !!propertyId && !!address && !!showWardBoyCheck
    }
  })

  if (!address) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
        <p className="text-yellow-800 font-semibold">⚠️ Wallet not connected</p>
      </div>
    )
  }

  const hasEnoughETH = ethBalance && ethBalance.value > 0n
  const hasUSDC = usdcBalance && usdcBalance > 0n
  const hasAllowance = usdcAllowance && usdcAllowance > 0n
  const isCorrectNetwork = chain?.id === 421614 // Arbitrum Sepolia

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-card p-6 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
          <span className="text-xl">🔍</span>
        </div>
        <h3 className="font-bold text-blue-900 text-lg">Transaction Checklist</h3>
      </div>
      
      {/* Network Check */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
        <span className="text-xl">
          {isCorrectNetwork ? '✅' : '❌'}
        </span>
        <span className="text-sm font-semibold">
          Network: <span className="text-gray-900">{chain?.name || 'Unknown'}</span>
          {!isCorrectNetwork && (
            <span className="text-red-600 ml-2">
              (Switch to Arbitrum Sepolia!)
            </span>
          )}
        </span>
      </div>

      {/* ETH Balance */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
        <span className="text-xl">
          {hasEnoughETH ? '✅' : '❌'}
        </span>
        <span className="text-sm font-semibold">
          ETH Balance: <span className="text-gray-900">{ethBalance ? formatUnits(ethBalance.value, 18).slice(0, 8) : '0'} ETH</span>
          {!hasEnoughETH && (
            <span className="text-red-600 ml-2">
              (Get testnet ETH from faucet!)
            </span>
          )}
        </span>
      </div>

      {/* USDC Balance */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
        <span className="text-xl">
          {hasUSDC ? '✅' : '❌'}
        </span>
        <span className="text-sm font-semibold">
          USDC Balance: <span className="text-gray-900">{usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC</span>
          {!hasUSDC && (
            <span className="text-red-600 ml-2">
              (Need USDC tokens!)
            </span>
          )}
        </span>
      </div>

      {/* USDC Allowance */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
        <span className="text-xl">
          {hasAllowance ? '✅' : '⚠️'}
        </span>
        <span className="text-sm font-semibold">
          USDC Approved: <span className="text-gray-900">{usdcAllowance ? formatUnits(usdcAllowance, 6) : '0'} USDC</span>
          {!hasAllowance && (
            <span className="text-yellow-600 ml-2">
              (Approve USDC first!)
            </span>
          )}
        </span>
      </div>

      {/* Ward Boy Check */}
      {showWardBoyCheck && propertyId && (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
          <span className="text-xl">
            {isWardBoy ? '✅' : '❌'}
          </span>
          <span className="text-sm font-semibold">
            Ward Boy Status: <span className="text-gray-900">{isWardBoy ? 'Assigned' : 'Not Assigned'}</span>
            {!isWardBoy && (
              <span className="text-red-600 ml-2">
                (Admin needs to assign you!)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Contract Addresses */}
      <details className="mt-4">
        <summary className="text-xs text-gray-600 cursor-pointer font-semibold hover:text-gray-900 transition-colors">
          Show Contract Addresses ▼
        </summary>
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-600">USDC:</span>
            <span className="text-gray-900">{CONTRACTS.USDC}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">RevenueSplitter:</span>
            <span className="text-gray-900">{CONTRACTS.RevenueSplitter}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Your Address:</span>
            <span className="text-gray-900">{address}</span>
          </div>
        </div>
      </details>
    </div>
  )
}
