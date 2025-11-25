'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { isAddress } from 'viem'
import { CONTRACTS, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { TransactionDebugger } from '@/components/TransactionDebugger'

interface PendingDeposit {
  id: string
  property_id: number
  property_name: string
  ward_boy_address: string
  deposit_month: string
  gross_rent: string
  total_miscellaneous: string
  net_amount: string
  notes: string
  bills_metadata: any
  created_at: string
  status?: string
  deposit_tx_hash?: string
  payout_tx_hash?: string
  approved_by?: string
  approved_at?: string
}

function AdminRevenueContent() {
  const { address, isConnected } = useAccount()
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([])
  const [approvedDeposits, setApprovedDeposits] = useState<PendingDeposit[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(null)

  const { writeContract, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash && processingDepositId) {
      // Update database after successful transaction
      updateDepositStatus(processingDepositId, txHash)
      setSuccess('Distribution successful! Deposit approved.')
      fetchPendingDeposits() // Refresh pending list
      fetchApprovedDeposits() // Refresh approved list
      setProcessingDepositId(null)
      setTimeout(() => setSuccess(''), 5000)
    }
  }, [isTxSuccess, txHash, processingDepositId])

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message || 'Transaction failed'
      // Handle common errors
      if (errorMessage.includes('user rejected')) {
        setError('Transaction rejected by user')
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient funds for gas')
      } else {
        setError(errorMessage)
      }
      setProcessingDepositId(null)
      setTimeout(() => setError(''), 5000)
    }
  }, [writeError])

  // Fetch pending deposits
  useEffect(() => {
    if (isConnected) {
      fetchPendingDeposits()
      fetchApprovedDeposits()
    }
  }, [isConnected])

  const fetchPendingDeposits = async () => {
    try {
      setLoading(true)
      if (!supabase) {
        setPendingDeposits([])
        return
      }
      
      const { data, error } = await supabase
        .from('rent_deposits')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingDeposits(data || [])
    } catch (err: any) {
      console.error('Error fetching deposits:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchApprovedDeposits = async () => {
    try {
      if (!supabase) {
        setApprovedDeposits([])
        return
      }
      
      const { data, error } = await supabase
        .from('rent_deposits')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(20) // Last 20 approved deposits

      if (error) throw error
      setApprovedDeposits(data || [])
    } catch (err: any) {
      console.error('Error fetching approved deposits:', err)
    }
  }

  const updateDepositStatus = async (depositId: string, txHash: `0x${string}`) => {
    if (!supabase) return

    try {
      const updateData = {
        status: 'approved',
        approved_by: address?.toLowerCase() || null,
        approved_at: new Date().toISOString(),
        payout_tx_hash: txHash as string,
      }
      
      const { error } = await supabase
        .from('rent_deposits')
        // @ts-ignore - rent_deposits table not in generated types yet
        .update(updateData)
        .eq('id', depositId)

      if (error) {
        console.error('Database update error:', error)
      }
    } catch (err) {
      console.error('Error updating deposit status:', err)
    }
  }

  const handleCallOutPay = async (deposit: PendingDeposit) => {
    try {
      setError('')
      setSuccess('')
      setProcessingDepositId(deposit.id)
      
      // Call contract with explicit gas limit
      // Database will be updated in useEffect after transaction success
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: 'callOutPay',
        args: [BigInt(deposit.property_id)],
        gas: 500000n, // Explicit gas limit for distribution
      })

    } catch (err: any) {
      setError(err.message || 'Failed to trigger payout')
      setProcessingDepositId(null)
    }
  }

  const formatUSDC = (amount: string) => {
    return (parseInt(amount) / 1e6).toFixed(2)
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Access Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access admin features
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Revenue Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage ward boys and approve rent distributions
        </p>
      </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Transaction Debugger */}
        <TransactionDebugger />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Distributions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Pending Distributions
                </h2>
                <button
                  onClick={fetchPendingDeposits}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : pendingDeposits.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No pending distributions
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {pendingDeposits.map((deposit) => {
                  const netAmount = parseFloat(formatUSDC(deposit.net_amount))
                  const platformFee = netAmount * 0.03
                  const shareholderAmount = netAmount - platformFee

                  return (
                    <div
                      key={deposit.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {deposit.property_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Property ID: {deposit.property_id} | {deposit.deposit_month}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ward Boy: {deposit.ward_boy_address.slice(0, 6)}...{deposit.ward_boy_address.slice(-4)}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs font-medium rounded-full">
                          Pending
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Financial Breakdown
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Gross Rent:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                ${formatUSDC(deposit.gross_rent)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Misc. Fees:</span>
                              <span className="text-red-600 dark:text-red-400">
                                -${formatUSDC(deposit.total_miscellaneous)}
                              </span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 flex justify-between font-medium">
                              <span className="text-gray-900 dark:text-white">Net Amount:</span>
                              <span className="text-blue-600 dark:text-blue-400">
                                ${netAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            After Approval
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Platform Fee (3%):</span>
                              <span className="text-gray-900 dark:text-white">
                                -${platformFee.toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t border-green-200 dark:border-green-800 pt-1 flex justify-between font-medium">
                              <span className="text-gray-900 dark:text-white">For Shareholders:</span>
                              <span className="text-green-600 dark:text-green-400">
                                ${shareholderAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {deposit.notes && (
                        <div className="mb-4 text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
                          <span className="text-gray-600 dark:text-gray-400">{deposit.notes}</span>
                        </div>
                      )}

                      {deposit.bills_metadata && deposit.bills_metadata.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            📎 {deposit.bills_metadata.length} bill(s) attached
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => handleCallOutPay(deposit)}
                        disabled={isTxPending}
                        className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                      >
                        {isTxPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          '✓ Call Out Pay & Distribute'
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Approved Deposits History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Approved Deposits History
              </h2>
              <button
                onClick={fetchApprovedDeposits}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Refresh
              </button>
            </div>

            {approvedDeposits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No approved deposits yet
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <div className="space-y-3">{approvedDeposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {deposit.property_name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Property #{deposit.property_id} | {deposit.deposit_month}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Net Amount:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              ${formatUSDC(deposit.net_amount)} USDC
                            </span>
                          </div>
                          {deposit.approved_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Approved:</span>
                              <span className="text-gray-900 dark:text-gray-300">
                                {new Date(deposit.approved_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {deposit.payout_tx_hash && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">TX:</span>
                              <a
                                href={`https://sepolia.arbiscan.io/tx/${deposit.payout_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-xs"
                              >
                                {deposit.payout_tx_hash.slice(0, 10)}...{deposit.payout_tx_hash.slice(-8)}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs font-medium rounded-full">
                        Approved
                      </span>
                    </div>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }
  
export default function AdminRevenuePage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/dashboard">
      <AdminLayout>
        <AdminRevenueContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}
