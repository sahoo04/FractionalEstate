'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Clock, CheckCircle, FileText } from 'lucide-react'

interface StatsCardsProps {
  address: string
  assignedProperties: number[]
}

export function StatsCards({ address, assignedProperties }: StatsCardsProps) {
  const [stats, setStats] = useState({
    totalDeposits: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    totalRevenue: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase || !address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const lowerAddress = address.toLowerCase()

        // Fetch all deposits for this ward boy
        const { data: deposits, error } = await supabase
          .from('rent_deposits')
          .select('status, net_amount, created_at, approved_at')
          .eq('ward_boy_address', lowerAddress)

        if (error) {
          console.error('Error fetching stats:', error)
          setIsLoading(false)
          return
        }

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const depositsArray = (deposits || []) as Array<{
          status?: string | null
          net_amount?: string | null
          approved_at?: string | null
        }>

        const statsData = {
          totalDeposits: depositsArray.length,
          pendingApprovals: depositsArray.filter(d => d.status === 'pending').length,
          approvedThisMonth: depositsArray.filter(
            d => d.status === 'approved' && 
            d.approved_at && 
            new Date(d.approved_at) >= startOfMonth
          ).length,
          totalRevenue: depositsArray.reduce((sum, d) => {
            const amount = parseFloat(d.net_amount || '0') / 1e6
            return sum + amount
          }, 0),
        }

        setStats(statsData)
      } catch (error) {
        console.error('Error calculating stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [address])

  const formatUSDC = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }

  const statCards = [
    {
      label: 'Total Deposits',
      value: stats.totalDeposits,
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-200',
    },
    {
      label: 'Approved This Month',
      value: stats.approvedThisMonth,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
    },
    {
      label: 'Total Revenue',
      value: `$${formatUSDC(stats.totalRevenue)}`,
      icon: DollarSign,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl shadow-card p-6 border-2 ${stat.borderColor}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 bg-gradient-to-br ${stat.color} rounded-2xl shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
