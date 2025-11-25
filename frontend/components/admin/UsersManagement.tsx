'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface User {
  wallet_address: string
  name: string | null
  email: string | null
  role: string
  kyc_status: string
  created_at: string
}

export function UsersManagementContent() {
  const { role } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterKYC, setFilterKYC] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch users
  useEffect(() => {
    if (role !== 'ADMIN') return

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users/list')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
          setFilteredUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [role])

  // Apply filters
  useEffect(() => {
    let filtered = [...users]

    if (filterRole !== 'ALL') {
      filtered = filtered.filter(u => u.role === filterRole)
    }

    if (filterKYC !== 'ALL') {
      filtered = filtered.filter(u => u.kyc_status === filterKYC)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u => 
        u.wallet_address.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filtered)
  }, [filterRole, filterKYC, searchQuery, users])

  const getRoleBadge = (role: string) => {
    const configs = {
      ADMIN: { gradient: 'from-success-500 to-success-600', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      SELLER: { gradient: 'from-blue-500 to-blue-600', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      CLIENT: { gradient: 'from-web3-500 to-web3-600', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
      NONE: { gradient: 'from-gray-500 to-gray-600', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' }
    }
    return configs[role as keyof typeof configs] || configs.NONE
  }

  const getKYCBadge = (status: string) => {
    const configs = {
      APPROVED: { gradient: 'from-success-500 to-success-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      PENDING: { gradient: 'from-yellow-500 to-yellow-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      REJECTED: { gradient: 'from-red-500 to-red-600', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
      NONE: { gradient: 'from-gray-500 to-gray-600', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' }
    }
    return configs[status as keyof typeof configs] || configs.NONE
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-500 to-web3-500 rounded-2xl p-8 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white break-words">Users Management</h1>
              <p className="text-white/90 break-words">View and manage all platform users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Users
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wallet, name, or email..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="SELLER">Seller</option>
              <option value="CLIENT">Client</option>
              <option value="NONE">None</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Filter by KYC
            </label>
            <select
              value={filterKYC}
              onChange={(e) => setFilterKYC(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="NONE">None</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-20" />
                    <div className="h-6 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center border border-gray-100">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-web3-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-medium">No users found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role)
              const kycBadge = getKYCBadge(user.kyc_status)
              
              return (
                <div key={user.wallet_address} className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-gray-100 transition-all duration-300 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-6">
                      {/* Avatar */}
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-web3-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-xl">
                          {user.wallet_address.slice(2, 4).toUpperCase()}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 break-words">
                              {user.name || 'Unnamed User'}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono break-all">
                              {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-8)}
                            </p>
                            {user.email && (
                              <p className="text-sm text-gray-600 mt-1 break-words">{user.email}</p>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm bg-gradient-to-r ${roleBadge.gradient} text-white`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roleBadge.icon} />
                              </svg>
                              {user.role}
                            </div>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm bg-gradient-to-r ${kycBadge.gradient} text-white`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={kycBadge.icon} />
                              </svg>
                              KYC: {user.kyc_status}
                            </div>
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card p-4 border border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredUsers.length}</span> of <span className="font-bold text-gray-900">{users.length}</span> users
              </span>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="px-3 py-1 bg-success-100 text-success-700 rounded-lg font-bold">
                  {users.filter(u => u.role === 'ADMIN').length} Admins
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold">
                  {users.filter(u => u.role === 'SELLER').length} Sellers
                </span>
                <span className="px-3 py-1 bg-web3-100 text-web3-700 rounded-lg font-bold">
                  {users.filter(u => u.role === 'CLIENT').length} Clients
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg font-bold">
                  {users.filter(u => u.kyc_status === 'PENDING').length} KYC Pending
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
