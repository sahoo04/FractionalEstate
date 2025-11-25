/**
 * TanStack Query (React Query) Configuration
 * Provides caching, deduplication, and prefetching for data fetching
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Deduplication: Multiple components requesting same data will share the request
      staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh
      gcTime: 1000 * 60 * 5, // 5 minutes - cache garbage collection (formerly cacheTime)
      
      // Retry configuration
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch configuration
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
})

/**
 * Query keys factory for consistent cache keys
 */
export const queryKeys = {
  // Property queries
  property: (tokenId: number) => ['property', tokenId] as const,
  properties: (tokenIds: number[]) => ['properties', ...tokenIds] as const,
  propertyMetadata: (tokenId: number) => ['property', 'metadata', tokenId] as const,
  
  // Portfolio queries
  portfolio: (address: string) => ['portfolio', address] as const,
  userBalances: (address: string, tokenIds: number[]) => ['balances', address, ...tokenIds] as const,
  
  // Rewards queries
  claimable: (tokenId: number, address: string) => ['claimable', tokenId, address] as const,
  claimables: (tokenIds: number[], address: string) => ['claimables', address, ...tokenIds] as const,
  
  // Marketplace queries
  listings: () => ['listings'] as const,
  listing: (listingId: number) => ['listing', listingId] as const,
  
  // User queries
  userRole: (address: string) => ['userRole', address] as const,
  kycStatus: (address: string) => ['kycStatus', address] as const,
  userProfile: (address: string) => ['userProfile', address] as const,
} as const
