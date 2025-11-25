'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { queryKeys } from '@/lib/queryClient'
import { multicallRead } from '@/lib/multicall'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { InvestmentDialog } from './InvestmentDialog'

interface PropertyCardProps {
  property: {
    id: string
    tokenId: number
    name: string
    location: string
    imageUrl?: string
    pricePerShare: number
    totalShares: number
    sharesSold: number
    expectedAPY: number
    propertyType: string
    investorCount: number
    occupancyStatus: string
  }
  variant?: 'grid' | 'list'
  showInvestButton?: boolean
  onInvest?: () => void
}

export function PropertyCardV2({ 
  property, 
  variant = 'grid',
  showInvestButton = false,
  onInvest 
}: PropertyCardProps) {
  const queryClient = useQueryClient()
  const publicClient = usePublicClient()
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false)
  
  const fundingProgress = calculatePercentage(property.sharesSold, property.totalShares)
  const isFullyFunded = fundingProgress >= 100
  const sharesAvailable = property.totalShares - property.sharesSold
  
  // Prefetch property details on hover
  const handlePrefetch = () => {
    if (!publicClient) return
    
    // Skip prefetch if property doesn't exist on-chain yet
    // This happens when properties are in database but not yet minted on blockchain
    if (property.tokenId === 0 || !property.tokenId) return
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.property(property.tokenId),
      queryFn: async () => {
        try {
          const results = await multicallRead(publicClient, [
            {
              address: CONTRACTS.PropertyShare1155,
              abi: PROPERTY_SHARE_1155_ABI,
              functionName: 'getProperty',
              args: [BigInt(property.tokenId)]
            },
            {
              address: CONTRACTS.PropertyShare1155,
              abi: PROPERTY_SHARE_1155_ABI,
              functionName: 'totalSupply',
              args: [BigInt(property.tokenId)]
            }
          ])
          return {
            property: results[0].success ? results[0].data : null,
            totalSupply: results[1].success ? results[1].data : null
          }
        } catch (error) {
          // Silently fail for prefetch - property might not exist on-chain yet
          return { property: null, totalSupply: null }
        }
      },
      staleTime: 1000 * 60 * 2
    })
  }
  
  // Better placeholder images
  const getPlaceholderImage = (type: string) => {
    const placeholders = {
      'VILLA': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop&q=80',
      'APARTMENT': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop&q=80',
      'LAND': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop&q=80',
      'COMMERCIAL': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop&q=80',
    }
    return placeholders[type as keyof typeof placeholders] || placeholders['VILLA']
  }
  
  const imageUrl = property.imageUrl || getPlaceholderImage(property.propertyType)

  const handleInvestClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowInvestmentDialog(true)
  }

  return (
    <>
      <Link href={`/property/${property.tokenId}`}>
        <div 
        className="group relative bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
        onMouseEnter={handlePrefetch}
      >
        {/* Image Container */}
        <div className="relative h-56 overflow-hidden bg-gray-100">
          <Image 
            src={imageUrl} 
            alt={property.name} 
            fill 
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          
          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-900">
              {property.propertyType}
            </span>
            <span className="px-3 py-1.5 bg-web3-500/95 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              {property.expectedAPY}% APY
            </span>
          </div>

          {/* Funding Progress Badge */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-gray-700">
                  {fundingProgress.toFixed(0)}% Funded
                </span>
                <span className="text-xs text-gray-600">
                  {formatNumber(sharesAvailable)} left
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title & Location */}
          <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {property.name}
          </h3>
          <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {property.location}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-0.5">Price per Share</div>
              <div className="font-bold text-gray-900">{formatCurrency(property.pricePerShare)}</div>
            </div>
            <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-3">
              <div className="text-xs text-success-700 mb-0.5">Monthly Yield</div>
              <div className="font-bold text-success-800">~₹{Math.round(property.pricePerShare * property.expectedAPY / 100 / 12)}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{property.investorCount} investors</span>
            </div>
            
            {showInvestButton && sharesAvailable > 0 ? (
              <button
                onClick={handleInvestClick}
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-web3-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Invest Now
              </button>
            ) : (
              <div className="text-sm font-semibold text-primary-600 group-hover:text-primary-700 flex items-center gap-1">
                View Details
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Glow Effect on Hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl ring-2 ring-primary-400/30 ring-offset-2"></div>
        </div>
      </div>
    </Link>

    {/* Investment Dialog */}
    <InvestmentDialog
      isOpen={showInvestmentDialog}
      onClose={() => setShowInvestmentDialog(false)}
      propertyId={property.tokenId}
      propertyName={property.name}
      pricePerShare={property.pricePerShare}
      availableShares={sharesAvailable}
      onSuccess={() => {
        setShowInvestmentDialog(false)
        if (onInvest) onInvest()
      }}
    />
  </>
  )
}

// Skeleton Loader
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card animate-pulse">
      <div className="h-56 bg-gray-200" />
      <div className="p-5">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-16 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-full" />
      </div>
    </div>
  )
}
