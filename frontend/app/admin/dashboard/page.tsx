'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatedSection } from '@/components/ui/AnimatedSection'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    activeProperties: 0,
    totalVolume: 0,
    loading: true
  })

  useEffect(() => {
    // Fetch admin stats
    const fetchStats = async () => {
      try {
        const [usersRes, kycRes, propsRes] = await Promise.all([
          fetch('/api/admin/users/list'),
          fetch('/api/admin/kyc/list'),
          fetch('/api/admin/properties/list')
        ])

        const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
        const kycData = kycRes.ok ? await kycRes.json() : { documents: [] }
        const propsData = propsRes.ok ? await propsRes.json() : { properties: [] }

        const users = usersData.users || []
        const kycDocs = kycData.documents || []
        const properties = propsData.properties || []

        // Calculate total volume
        const volume = properties.reduce((sum: number, prop: any) => {
          const shares = prop.total_shares || 0
          const price = parseFloat(prop.price_per_share || '0')
          return sum + (shares * price)
        }, 0)

        setStats({
          totalUsers: users.length,
          pendingKYC: kycDocs.filter((doc: any) => doc.status === 'PENDING').length,
          activeProperties: properties.filter((prop: any) => prop.status === 'ACTIVE').length,
          totalVolume: volume,
          loading: false
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      gradient: 'from-blue-500 to-blue-600',
      change: '+12%'
    },
    {
      label: 'Pending KYC',
      value: stats.pendingKYC,
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-yellow-500 to-yellow-600',
      change: '-5%'
    },
    {
      label: 'Active Properties',
      value: stats.activeProperties,
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      gradient: 'from-success-500 to-success-600',
      change: '+8%'
    },
    {
      label: 'Total Volume',
      value: `$${stats.totalVolume.toLocaleString()}`,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      gradient: 'from-web3-500 to-web3-600',
      change: '+23%'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <AnimatedSection animation="slideUp">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => (
            <div
              key={idx}
              className="group relative bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100 overflow-hidden"
            >
              {/* Gradient Background */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide break-words">{stat.label}</h3>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-1 break-words">
                      {stats.loading ? '...' : stat.value}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-success-600 text-sm font-medium">{stat.change}</span>
                      <span className="text-gray-500 text-sm">from last month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Quick Actions */}
      <AnimatedSection animation="slideUp" delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 break-words">Pending KYC</h3>
                <p className="text-sm text-gray-500 break-words">{stats.pendingKYC} awaiting review</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/admin/kyc')}
              className="w-full px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium"
            >
              Review Now
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-web3-500 to-web3-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 break-words">New Property</h3>
                <p className="text-sm text-gray-500 break-words">Create listing</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/seller/create-property')}
              className="w-full px-4 py-2 bg-web3-50 text-web3-600 rounded-lg hover:bg-web3-100 transition-colors font-medium"
            >
              Add Property
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 break-words">Analytics</h3>
                <p className="text-sm text-gray-500 break-words">View reports</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/admin/analytics')}
              className="w-full px-4 py-2 bg-success-50 text-success-600 rounded-lg hover:bg-success-100 transition-colors font-medium"
            >
              View Analytics
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* Recent Activity */}
      <AnimatedSection animation="slideUp" delay={0.2}>
        <div className="bg-white rounded-2xl shadow-card border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No recent activity</p>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}
