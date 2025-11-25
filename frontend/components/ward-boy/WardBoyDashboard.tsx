'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, FileText } from 'lucide-react'
import { StatsCards } from './StatsCards'
import { RecentActivity } from './RecentActivity'

interface WardBoyDashboardProps {
  assignedProperties: number[]
  address: string
  onNavigateToDeposits: () => void
}

export function WardBoyDashboard({ assignedProperties, address, onNavigateToDeposits }: WardBoyDashboardProps) {
  const [propertyDetails, setPropertyDetails] = useState<any[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(true)

  // Fetch property details
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!supabase || assignedProperties.length === 0) {
        setIsLoadingProperties(false)
        return
      }

      try {
        setIsLoadingProperties(true)
        const { data, error } = await supabase
          .from('properties')
          .select('id, name, city, state, token_id')
          .in('token_id', assignedProperties)

        if (error) {
          console.error('Error fetching properties:', error)
          setPropertyDetails([])
        } else {
          setPropertyDetails(data || [])
        }
      } catch (error) {
        console.error('Error fetching properties:', error)
        setPropertyDetails([])
      } finally {
        setIsLoadingProperties(false)
      }
    }

    fetchPropertyDetails()
  }, [assignedProperties])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards address={address} assignedProperties={assignedProperties} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onNavigateToDeposits}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl p-6 hover:shadow-lg transition-all flex items-center gap-4 group"
        >
          <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">New Deposit</h3>
            <p className="text-sm text-purple-100">Submit a new rent deposit</p>
          </div>
        </button>

        <a
          href="#history"
          onClick={(e) => {
            e.preventDefault()
            // This will be handled by parent component
          }}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-6 hover:shadow-lg transition-all flex items-center gap-4 group"
        >
          <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">View History</h3>
            <p className="text-sm text-blue-100">Check deposit history</p>
          </div>
        </a>
      </div>

      {/* Assigned Properties Overview */}
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-card p-6 border-2 border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Properties</h2>
          <span className="px-3 py-1 bg-gradient-to-r from-purple-400 to-indigo-400 text-white text-sm font-bold rounded-lg">
            {assignedProperties.length} {assignedProperties.length === 1 ? 'Property' : 'Properties'}
          </span>
        </div>
        {isLoadingProperties ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedProperties.map((propertyId) => {
              const property = propertyDetails.find(p => p.token_id === propertyId)
              return (
                <div
                  key={propertyId}
                  className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {property?.name || `Property #${propertyId}`}
                      </h3>
                      {property && (
                        <p className="text-sm text-gray-600">
                          {property.city}, {property.state}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                      #{propertyId}
                    </span>
                  </div>
                  <button
                    onClick={onNavigateToDeposits}
                    className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
                  >
                    Deposit Rent
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <RecentActivity address={address} />
    </div>
  )
}
