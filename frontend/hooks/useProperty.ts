/**
 * Property Data Hook with Multicall Optimization
 * Replaces individual RPC calls with batched multicall requests
 */

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { multicallRead } from '@/lib/multicall'
import { queryKeys } from '@/lib/queryClient'
import { logger } from '@/lib/logger'

export interface PropertyData {
  name: string
  location: string
  totalShares: bigint
  pricePerShare: bigint
  exists: boolean
}

export interface PropertyFullData {
  property: PropertyData | null
  totalSupply: bigint | null
  isLoading: boolean
  error: Error | null
}

/**
 * Fetch single property with multicall (batches getProperty + totalSupply)
 */
export function useProperty(tokenId: number): PropertyFullData {
  const publicClient = usePublicClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.property(tokenId),
    queryFn: async () => {
      if (!publicClient) {
        throw new Error('Public client not available')
      }

      logger.debug('Fetching property with multicall', { tokenId })

      const results = await multicallRead(publicClient, [
        {
          address: CONTRACTS.PropertyShare1155,
          abi: PROPERTY_SHARE_1155_ABI,
          functionName: 'getProperty',
          args: [BigInt(tokenId)]
        },
        {
          address: CONTRACTS.PropertyShare1155,
          abi: PROPERTY_SHARE_1155_ABI,
          functionName: 'totalSupply',
          args: [BigInt(tokenId)]
        }
      ])

      const propertyData = results[0].success ? (results[0].data as any) : null
      const totalSupply = results[1].success ? (results[1].data as bigint) : null

      return {
        property: propertyData,
        totalSupply
      }
    },
    enabled: !!publicClient && tokenId >= 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  return {
    property: data?.property || null,
    totalSupply: data?.totalSupply || null,
    isLoading,
    error: error as Error | null
  }
}

/**
 * Batch fetch multiple properties with single multicall
 */
export function useProperties(tokenIds: number[]) {
  const publicClient = usePublicClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.properties(tokenIds),
    queryFn: async () => {
      if (!publicClient) {
        throw new Error('Public client not available')
      }

      logger.debug('Batch fetching properties with multicall', { 
        count: tokenIds.length,
        tokenIds 
      })

      // Build calls for all properties (2 calls per property)
      const calls = tokenIds.flatMap((tokenId) => [
        {
          address: CONTRACTS.PropertyShare1155,
          abi: PROPERTY_SHARE_1155_ABI,
          functionName: 'getProperty',
          args: [BigInt(tokenId)]
        },
        {
          address: CONTRACTS.PropertyShare1155,
          abi: PROPERTY_SHARE_1155_ABI,
          functionName: 'totalSupply',
          args: [BigInt(tokenId)]
        }
      ])

      const results = await multicallRead(publicClient, calls)

      // Parse results into property objects
      const properties = tokenIds.map((tokenId, index) => {
        const propertyResult = results[index * 2]
        const totalSupplyResult = results[index * 2 + 1]

        return {
          tokenId,
          property: propertyResult.success ? (propertyResult.data as any) : null,
          totalSupply: totalSupplyResult.success ? (totalSupplyResult.data as bigint) : null
        }
      })

      return properties
    },
    enabled: !!publicClient && tokenIds.length > 0,
    staleTime: 1000 * 60 * 2,
  })

  return {
    properties: data || [],
    isLoading,
    error: error as Error | null
  }
}

// Legacy export for backward compatibility
export { useProperty as usePropertyData }
