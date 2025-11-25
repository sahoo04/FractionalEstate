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
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">⚠️ Wallet not connected</p>
      </div>
    )
  }

  const hasEnoughETH = ethBalance && ethBalance.value > 0n
  const hasUSDC = usdcBalance && usdcBalance > 0n
  const hasAllowance = usdcAllowance && usdcAllowance > 0n
  const isCorrectNetwork = chain?.id === 421614 // Arbitrum Sepolia

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">🔍 Transaction Checklist</h3>
      
      {/* Network Check */}
      <div className="flex items-center gap-2">
        <span className={isCorrectNetwork ? '✅' : '❌'}>
          {isCorrectNetwork ? '✅' : '❌'}
        </span>
        <span className="text-sm">
          Network: {chain?.name || 'Unknown'} 
          {!isCorrectNetwork && (
            <span className="text-red-600 dark:text-red-400 ml-2">
              (Switch to Arbitrum Sepolia!)
            </span>
          )}
        </span>
      </div>

      {/* ETH Balance */}
      <div className="flex items-center gap-2">
        <span className={hasEnoughETH ? '✅' : '❌'}>
          {hasEnoughETH ? '✅' : '❌'}
        </span>
        <span className="text-sm">
          ETH Balance: {ethBalance ? formatUnits(ethBalance.value, 18) : '0'} ETH
          {!hasEnoughETH && (
            <span className="text-red-600 dark:text-red-400 ml-2">
              (Get testnet ETH from faucet!)
            </span>
          )}
        </span>
      </div>

      {/* USDC Balance */}
      <div className="flex items-center gap-2">
        <span className={hasUSDC ? '✅' : '❌'}>
          {hasUSDC ? '✅' : '❌'}
        </span>
        <span className="text-sm">
          USDC Balance: {usdcBalance ? formatUnits(usdcBalance, 6) : '0'} USDC
          {!hasUSDC && (
            <span className="text-red-600 dark:text-red-400 ml-2">
              (Need USDC tokens!)
            </span>
          )}
        </span>
      </div>

      {/* USDC Allowance */}
      <div className="flex items-center gap-2">
        <span className={hasAllowance ? '✅' : '⚠️'}>
          {hasAllowance ? '✅' : '⚠️'}
        </span>
        <span className="text-sm">
          USDC Approved: {usdcAllowance ? formatUnits(usdcAllowance, 6) : '0'} USDC
          {!hasAllowance && (
            <span className="text-yellow-600 dark:text-yellow-400 ml-2">
              (Approve USDC first!)
            </span>
          )}
        </span>
      </div>

      {/* Ward Boy Check */}
      {showWardBoyCheck && propertyId && (
        <div className="flex items-center gap-2">
          <span className={isWardBoy ? '✅' : '❌'}>
            {isWardBoy ? '✅' : '❌'}
          </span>
          <span className="text-sm">
            Ward Boy Status: {isWardBoy ? 'Assigned' : 'Not Assigned'}
            {!isWardBoy && (
              <span className="text-red-600 dark:text-red-400 ml-2">
                (Admin needs to assign you!)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Contract Addresses */}
      <details className="mt-3">
        <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          Show Contract Addresses
        </summary>
        <div className="mt-2 text-xs space-y-1 font-mono">
          <div>USDC: {CONTRACTS.USDC}</div>
          <div>RevenueSplitter: {CONTRACTS.RevenueSplitter}</div>
          <div>Your Address: {address}</div>
        </div>
      </details>
    </div>
  )
}
