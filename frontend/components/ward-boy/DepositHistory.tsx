'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ExternalLink, FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatUnits } from 'viem'

interface Deposit {
  id: string
  property_id: number
  property_name: string
  deposit_month: string
  gross_rent: string
  total_miscellaneous: string
  net_amount: string
  status: string
  created_at: string
  approved_at?: string
  deposit_tx_hash?: string
  payout_tx_hash?: string
  bills_metadata?: any[]
  notes?: string
}

interface DepositHistoryProps {
  address: string
}

export function DepositHistory({ address }: DepositHistoryProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')

  useEffect(() => {
    const fetchDeposits = async () => {
      if (!supabase || !address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const lowerAddress = address.toLowerCase()

        const { data, error } = await supabase
          .from('rent_deposits')
          .select('*')
          .eq('ward_boy_address', lowerAddress)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching deposits:', error)
          setDeposits([])
        } else {
          setDeposits(data || [])
        }
      } catch (error) {
        console.error('Error fetching deposits:', error)
        setDeposits([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeposits()
  }, [address])

  const formatUSDC = (amount: string) => {
    return (parseInt(amount) / 1e6).toFixed(2)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'approved':
        return (
          <span className="px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-gradient-to-r from-red-400 to-pink-400 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-gray-400 text-white text-xs font-bold rounded-xl">
            {status}
          </span>
        )
    }
  }

  const filteredDeposits = deposits.filter(deposit => {
    if (filterStatus === 'all') return true
    return deposit.status === filterStatus
  })

  const sortedDeposits = [...filteredDeposits].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'amount':
        return parseFloat(b.net_amount) - parseFloat(a.net_amount)
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (deposits.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-900 font-bold text-lg mb-2">No Deposits Yet</p>
        <p className="text-gray-600">Your deposit history will appear here once you submit your first deposit.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl border-2 border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatus === 'all'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({deposits.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatus === 'pending'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({deposits.filter(d => d.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatus === 'approved'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({deposits.filter(d => d.status === 'approved').length})
          </button>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="date">Sort by Date</option>
          <option value="amount">Sort by Amount</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      {/* Deposit List */}
      <div className="space-y-4">
        {sortedDeposits.map((deposit) => (
          <div
            key={deposit.id}
            className="bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all hover:shadow-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {deposit.property_name || `Property #${deposit.property_id}`}
                  </h3>
                  {getStatusBadge(deposit.status)}
                </div>
                <p className="text-sm text-gray-600">
                  Property #{deposit.property_id} • {deposit.deposit_month}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Gross Rent</p>
                <p className="font-bold text-gray-900">${formatUSDC(deposit.gross_rent)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-xs text-gray-600 mb-1">Misc. Fees</p>
                <p className="font-bold text-red-600">-${formatUSDC(deposit.total_miscellaneous)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Net Amount</p>
                <p className="font-bold text-green-600 text-lg">${formatUSDC(deposit.net_amount)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-gray-600">Deposited:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {new Date(deposit.created_at).toLocaleString()}
                </span>
              </div>
              {deposit.approved_at && (
                <div>
                  <span className="text-gray-600">Approved:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {new Date(deposit.approved_at).toLocaleString()}
                  </span>
                </div>
              )}
              {deposit.deposit_tx_hash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${deposit.deposit_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                >
                  Deposit TX <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {deposit.payout_tx_hash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${deposit.payout_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 font-semibold flex items-center gap-1"
                >
                  Payout TX <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {deposit.bills_metadata && deposit.bills_metadata.length > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{deposit.bills_metadata.length} bill(s)</span>
                </div>
              )}
            </div>

            {deposit.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Notes:</span> {deposit.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
