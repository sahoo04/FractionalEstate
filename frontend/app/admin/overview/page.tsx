'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  totalProperties: number
  pendingKYC: number
  approvedKYC: number
  activeListings: number
  totalInvestment: string
}

function AdminOverviewContent() {
  const { role } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProperties: 0,
    pendingKYC: 0,
    approvedKYC: 0,
    activeListings: 0,
    totalInvestment: '0'
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch stats
  useEffect(() => {
    if (role !== 'ADMIN') return

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
          setRecentActivity(data.recentActivity || [])
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [role])

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Platform overview and management</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon="👥"
                link="/admin/users"
              />
              <StatCard
                title="Total Properties"
                value={stats.totalProperties}
                icon="🏠"
                link="/admin/properties"
              />
              <StatCard
                title="Pending KYC"
                value={stats.pendingKYC}
                icon="⏳"
                color="yellow"
                link="/admin/kyc"
              />
              <StatCard
                title="Approved KYC"
                value={stats.approvedKYC}
                icon="✅"
                color="green"
                link="/admin/kyc"
              />
              <StatCard
                title="Active Listings"
                value={stats.activeListings}
                icon="📋"
                link="/admin/properties"
              />
              <StatCard
                title="Total Investment"
                value={`$${stats.totalInvestment}`}
                icon="💰"
                color="blue"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/admin/kyc" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-semibold">Review KYC</div>
                </Link>
                <Link href="/admin/properties" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
                  <div className="text-3xl mb-2">🏠</div>
                  <div className="font-semibold">Manage Properties</div>
                </Link>
                <Link href="/admin/users" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="font-semibold">View Users</div>
                </Link>
                <Link href="/seller/create-property" className="p-4 border rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center">
                  <div className="text-3xl mb-2">➕</div>
                  <div className="font-semibold">Add Property</div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="text-2xl">{activity.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold">{activity.title}</div>
                        <div className="text-sm text-gray-600">{activity.description}</div>
                      </div>
                      <div className="text-xs text-gray-500">{activity.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </>
    )
}

export default function AdminOverview() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/dashboard">
      <AdminLayout>
        <AdminOverviewContent />
      </AdminLayout>
    </ProtectedRoute>
  )
}

function StatCard({ title, value, icon, color = 'gray', link }: any) {
  const colors = {
    gray: 'bg-gray-50 border-gray-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200'
  }

  const content = (
    <div className={`${colors[color as keyof typeof colors]} border rounded-lg p-6 hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div className="text-3xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  )

  return link ? <Link href={link}>{content}</Link> : content
}
