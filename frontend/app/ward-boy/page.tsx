'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import WardBoyDepositForm from '@/components/WardBoyDepositForm'
import { TransactionDebugger } from '@/components/TransactionDebugger'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Loader2 } from 'lucide-react'
import { MainLayout } from '@/components/layouts/MainLayout'

export default function WardBoyPage() {
  const { address, isConnected } = useAccount()
  const [assignedProperties, setAssignedProperties] = useState<number[]>([])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!address || !isConnected) {
      setIsChecking(false)
      return
    }

    // Fast lookup from Supabase database
    const checkAssignedProperties = async () => {
      setIsChecking(true)
      
      try {
        if (!supabase) {
          setAssignedProperties([])
          setIsChecking(false)
          return
        }

        // Query ward_boy_mappings table for this address
        const { data, error } = await (supabase as any)
          .from('ward_boy_mappings')
          .select('property_id')
          .eq('ward_boy_address', address.toLowerCase())
          .eq('is_active', true)

        if (error) {
          console.error('Error fetching ward boy properties:', error)
          setAssignedProperties([])
        } else {
          const propertyIds = data?.map((row: any) => row.property_id) || []
          setAssignedProperties(propertyIds)
        }
      } catch (error) {
        console.error('Error checking ward boy properties:', error)
        setAssignedProperties([])
      }
      
      setIsChecking(false)
    }

    checkAssignedProperties()
  }, [address, isConnected])

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Ward Boy Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Connect your wallet to access the dashboard (No login required)
          </p>
        </div>

        {/* Not Connected State */}
        {!isConnected && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
              👛 Connect Your Wallet
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-6">
              Ward boys don't need to create an account or complete KYC.
              <br />
              Simply connect your assigned wallet to access the dashboard.
            </p>
            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-2">How it works:</p>
              <ol className="text-left space-y-1 max-w-md mx-auto">
                <li>1. Admin assigns your wallet address to a property</li>
                <li>2. You connect your wallet using the button in top-right</li>
                <li>3. Dashboard automatically shows your assigned properties</li>
                <li>4. Submit rent deposits with expense bills</li>
              </ol>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isChecking && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Checking assigned properties...</p>
          </div>
        )}

        {/* No Properties Assigned */}
        {!isChecking && assignedProperties.length === 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                No Properties Assigned
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                You are not assigned as ward boy for any property. Please contact the admin to get assigned.
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                Your wallet: <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">{address}</code>
              </p>
            </div>
          </div>
        )}

        {/* Assigned Properties */}
        {!isChecking && assignedProperties.length > 0 && (
          <div className="space-y-8">
            {/* Success Message */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                ✓ Ward Boy Access Verified
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                You are assigned as ward boy for {assignedProperties.length} {assignedProperties.length === 1 ? 'property' : 'properties'}:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {assignedProperties.map(propId => (
                  <span key={propId} className="bg-green-100 dark:bg-green-900/40 px-3 py-1 rounded-full text-sm font-medium text-green-900 dark:text-green-100">
                    Property #{propId}
                  </span>
                ))}
              </div>
            </div>

            {/* Transaction Debugger */}
            <TransactionDebugger 
              propertyId={assignedProperties[0]} 
              showWardBoyCheck={true}
            />

            {/* Deposit Forms for Each Property */}
            {assignedProperties.map(propertyId => (
              <div key={propertyId}>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Submit Rent Deposit - Property #{propertyId}
                </h2>
                <WardBoyDepositForm prefilledPropertyId={propertyId} />
              </div>
            ))}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
                📋 Instructions
              </h3>
              <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Collect rent from tenant and handle all miscellaneous expenses</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Fill in the deposit form with property details and expense breakdown</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Upload bills and receipts for all expenses (electricity, repairs, etc.)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">4.</span>
                  <span>Review the summary and approve USDC spending</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">5.</span>
                  <span>Submit deposit - funds will be held pending admin approval</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">6.</span>
                  <span>Admin will review and trigger payout distribution to shareholders</span>
                </li>
              </ol>
            </div>

            {/* Deposit History - TODO: Implement */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Deposit History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Coming soon: View your past deposits and their status
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  )
}
