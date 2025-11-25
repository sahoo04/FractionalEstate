'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useReadContract } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'

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

export function PropertyCard({ 
  property, 
  variant = 'grid',
  showInvestButton = false,
  onInvest 
}: PropertyCardProps) {
  const router = useRouter()
  
  // Fetch real-time totalSupply from blockchain
  const { data: totalSupply, isLoading: isLoadingSupply } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'totalSupply',
    args: [BigInt(property.tokenId)],
  })
  
  // Use blockchain data if available, otherwise fallback to database value
  const totalSupplyValue = totalSupply ? Number(totalSupply as bigint) : (isLoadingSupply ? property.sharesSold : property.sharesSold)
  const sharesSold = totalSupply ? Number(totalSupply as bigint) : property.sharesSold
  const availableShares = property.totalShares - sharesSold
  const fundingProgress = calculatePercentage(sharesSold, property.totalShares)
  const isFullyFunded = fundingProgress >= 100 || availableShares <= 0
  
  // Only use actual image URL if provided, no mock/placeholder images
  const imageUrl = property.imageUrl && property.imageUrl.trim() !== '' ? property.imageUrl : null
  
  if (variant === 'list') {
    return (
      <Card variant="glass-interactive" padding="none" className="animate-slide-up group">
        <Link href={`/property/${property.tokenId}`}>
          <div className="flex gap-6 p-6">
            {/* Image */}
            <div className="relative w-48 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
              {imageUrl ? (
                <Image 
                  src={imageUrl} 
                  alt={property.name} 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-2 right-2 animate-scale-in">
                <Badge variant={isFullyFunded ? 'success' : 'warning'} size="sm">
                  {fundingProgress.toFixed(0)}% Funded
                </Badge>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 transition-colors duration-300 group-hover:text-primary-600">{property.name}</h3>
              <p className="text-sm text-gray-600 mb-3 transition-colors duration-300">📍 {property.location}</p>
              
              <div className="grid grid-cols-4 gap-4 mb-3">
                <div className="transition-transform duration-300 group-hover:scale-105">
                  <div className="text-xs text-gray-500">Price/Share</div>
                  <div className="font-semibold">{formatCurrency(property.pricePerShare)}</div>
                </div>
                <div className="transition-transform duration-300 group-hover:scale-105">
                  <div className="text-xs text-gray-500">Expected APY</div>
                  <div className="font-semibold text-green-600 transition-colors duration-300 group-hover:text-green-700">{property.expectedAPY}%</div>
                </div>
                <div className="transition-transform duration-300 group-hover:scale-105">
                  <div className="text-xs text-gray-500">Available</div>
                  <div className="font-semibold">
                    {formatNumber(property.totalShares - sharesSold)} shares
                  </div>
                </div>
                <div className="transition-transform duration-300 group-hover:scale-105">
                  <div className="text-xs text-gray-500">Investors</div>
                  <div className="font-semibold">{property.investorCount}</div>
                </div>
              </div>
              
              {/* Progress */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all duration-500 ease-out"
                  style={{ width: `${fundingProgress}%` }}
                />
              </div>
            </div>
          </div>
        </Link>
      </Card>
    )
  }
  
  // Grid variant (default)
  return (
    <Card variant="glass-interactive" padding="none" className="animate-slide-up group">
      <Link href={`/property/${property.tokenId}`}>
        {/* Image */}
        <div className="relative h-48 bg-gray-200 rounded-t-xl overflow-hidden">
          {imageUrl ? (
            <Image 
              src={imageUrl} 
              alt={property.name} 
              fill 
              className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute top-3 right-3 animate-scale-in">
            <Badge variant={isFullyFunded ? 'success' : 'warning'}>
              {fundingProgress.toFixed(0)}% Funded
            </Badge>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1 transition-colors duration-300 group-hover:text-primary-600">{property.name}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-1 transition-colors duration-300">📍 {property.location}</p>
          
          <div className="flex items-center justify-between mb-3">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <span className="text-2xl font-bold">{formatCurrency(property.pricePerShare)}</span>
              <span className="text-sm text-gray-500">/share</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600 transition-colors duration-300 group-hover:text-green-700">
                {property.expectedAPY}% APY
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{formatNumber(sharesSold)} / {formatNumber(property.totalShares)} shares</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-500 ease-out"
                style={{ width: `${fundingProgress}%` }}
              />
            </div>
          </div>
          
          {/* Details grid */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 border-t pt-3 transition-colors duration-300">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <div className="font-medium">Type</div>
              <div>{property.propertyType}</div>
            </div>
            <div className="transition-transform duration-300 group-hover:scale-105">
              <div className="font-medium">Investors</div>
              <div>{property.investorCount}</div>
            </div>
            <div className="transition-transform duration-300 group-hover:scale-105">
              <div className="font-medium">Status</div>
              <div>{property.occupancyStatus}</div>
            </div>
          </div>
          
          {showInvestButton && !isFullyFunded && availableShares > 0 && (
            <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // If custom onInvest callback provided, use it
                if (onInvest) {
                  onInvest()
                } else {
                  // Otherwise navigate to property details page
                  router.push(`/property/${property.tokenId}`)
                }
              }}
              className="btn-primary w-full mt-4 transition-all duration-300"
            >
              Invest Now
            </button>
          )}
          {showInvestButton && isFullyFunded && (
            <div className="w-full mt-4 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg text-center text-sm font-medium">
              Fully Funded
            </div>
          )}
        </div>
      </Link>
    </Card>
  )
}
