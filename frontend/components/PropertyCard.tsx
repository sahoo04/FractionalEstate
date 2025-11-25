'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatNumber, calculatePercentage } from '@/lib/utils'
import { queryKeys } from '@/lib/queryClient'
import { multicallRead } from '@/lib/multicall'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { useRouter } from 'next/navigation'

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
  const queryClient = useQueryClient()
  const publicClient = usePublicClient()
  const fundingProgress = calculatePercentage(property.sharesSold, property.totalShares)
  const isFullyFunded = fundingProgress >= 100
  
  // Prefetch property details on hover
  const handlePrefetch = () => {
    if (!publicClient) return
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.property(property.tokenId),
      queryFn: async () => {
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
      },
      staleTime: 1000 * 60 * 2
    })
  }
  
  // Better placeholder images based on property type
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
  
  if (variant === 'list') {
    return (
      <Card variant="interactive" padding="none">
        <Link href={`/property/${property.tokenId}`}>
          <div className="flex gap-6 p-6" onMouseEnter={handlePrefetch}>
            {/* Image */}
            <div className="relative w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
              <Image 
                src={imageUrl} 
                alt={property.name} 
                fill 
                className="object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge variant={isFullyFunded ? 'success' : 'warning'} size="sm">
                  {fundingProgress.toFixed(0)}% Funded
                </Badge>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
              <p className="text-sm text-gray-600 mb-3">📍 {property.location}</p>
              
              <div className="grid grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Price/Share</div>
                  <div className="font-semibold">{formatCurrency(property.pricePerShare)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Expected APY</div>
                  <div className="font-semibold text-green-600">{property.expectedAPY}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Available</div>
                  <div className="font-semibold">
                    {formatNumber(property.totalShares - property.sharesSold)} shares
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Investors</div>
                  <div className="font-semibold">{property.investorCount}</div>
                </div>
              </div>
              
              {/* Progress */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all"
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
    <Card variant="interactive" padding="none">
      <Link href={`/property/${property.tokenId}`}>
        <div onMouseEnter={handlePrefetch}>
        {/* Image */}
        <div className="relative h-48 bg-gray-200 rounded-t-xl overflow-hidden">
          <Image 
            src={imageUrl} 
            alt={property.name} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3">
            <Badge variant={isFullyFunded ? 'success' : 'warning'}>
              {fundingProgress.toFixed(0)}% Funded
            </Badge>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{property.name}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-1">📍 {property.location}</p>
          
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-bold">{formatCurrency(property.pricePerShare)}</span>
              <span className="text-sm text-gray-500">/share</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                {property.expectedAPY}% APY
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{formatNumber(property.sharesSold)} / {formatNumber(property.totalShares)} shares</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all"
                style={{ width: `${fundingProgress}%` }}
              />
            </div>
          </div>
          
          {/* Details grid */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 border-t pt-3">
            <div>
              <div className="font-medium">Type</div>
              <div>{property.propertyType}</div>
            </div>
            <div>
              <div className="font-medium">Investors</div>
              <div>{property.investorCount}</div>
            </div>
            <div>
              <div className="font-medium">Status</div>
              <div>{property.occupancyStatus}</div>
            </div>
          </div>
          
          {showInvestButton && (
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
              className="btn-primary w-full mt-4"
            >
              Invest Now
            </button>
          )}
        </div>
        </div>
      </Link>
    </Card>
  )
}





