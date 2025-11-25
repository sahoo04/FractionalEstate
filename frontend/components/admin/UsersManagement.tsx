'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

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
    const styles = {
      ADMIN: 'bg-green-100 text-green-800',
      SELLER: 'bg-blue-100 text-blue-800',
      CLIENT: 'bg-gray-100 text-gray-800',
      NONE: 'bg-red-100 text-red-800'
    }
    return styles[role as keyof typeof styles] || styles.NONE
  }

  const getKYCBadge = (status: string) => {
    const styles = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
      NONE: 'bg-gray-100 text-gray-800'
    }
    return styles[status as keyof typeof styles] || styles.NONE
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Users Management</h1>
        <p className="text-gray-600">View and manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wallet, name, or email..."
              className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="SELLER">Seller</option>
              <option value="CLIENT">Client</option>
              <option value="NONE">None</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by KYC
            </label>
            <select
              value={filterKYC}
              onChange={(e) => setFilterKYC(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
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

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name / Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KYC Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.wallet_address} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{user.name || '-'}</div>
                      <div className="text-gray-500 text-xs">{user.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getKYCBadge(user.kyc_status)}`}>
                        {user.kyc_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </>
  )
}
