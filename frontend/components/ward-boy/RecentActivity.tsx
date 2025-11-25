'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, CheckCircle, FileText } from 'lucide-react'

interface RecentActivityProps {
  address: string
}

interface Activity {
  id: string
  property_id: number
  property_name: string
  status: string
  created_at: string
  approved_at?: string
  net_amount: string
}

export function RecentActivity({ address }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      if (!supabase || !address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const lowerAddress = address.toLowerCase()

        const { data, error } = await supabase
          .from('rent_deposits')
          .select('id, property_id, property_name, status, created_at, approved_at, net_amount')
          .eq('ward_boy_address', lowerAddress)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) {
          console.error('Error fetching activities:', error)
          setActivities([])
        } else {
          setActivities(data || [])
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [address])

  const formatUSDC = (amount: string) => {
    return (parseInt(amount) / 1e6).toFixed(2)
  }

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      default:
        return <FileText className="w-5 h-5 text-gray-600" />
    }
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'from-yellow-50 to-orange-50 border-yellow-200'
      case 'approved':
        return 'from-green-50 to-emerald-50 border-green-200'
      default:
        return 'from-gray-50 to-gray-100 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border-2 border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">No recent activity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg">
          Last 5
        </span>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`bg-gradient-to-br ${getActivityColor(activity.status)} rounded-xl p-4 border-2 flex items-start gap-4`}
          >
            <div className="p-2 bg-white rounded-lg flex-shrink-0">
              {getActivityIcon(activity.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {activity.property_name || `Property #${activity.property_id}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    Deposit • {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-bold text-gray-900 whitespace-nowrap">
                  ${formatUSDC(activity.net_amount)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  activity.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : activity.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {activity.status}
                </span>
                {activity.approved_at && (
                  <span className="text-xs text-gray-500">
                    Approved {new Date(activity.approved_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
