import { useReadContract } from 'wagmi'
import { CONTRACTS, REVENUE_SPLITTER_ABI } from '@/lib/contracts'
import { useState, useEffect } from 'react'

export function useIsWardBoy(address: `0x${string}` | undefined, propertyId?: number) {
  const { data: isWardBoy, isLoading, refetch } = useReadContract({
    address: CONTRACTS.RevenueSplitter as `0x${string}`,
    abi: REVENUE_SPLITTER_ABI,
    functionName: 'isPropertyManager',
    args: propertyId !== undefined && address ? [BigInt(propertyId), address] : undefined,
    query: {
      enabled: !!address && propertyId !== undefined,
    }
  })

  return {
    isWardBoy: !!isWardBoy,
    isLoading,
    refetch
  }
}

// Get all properties where user is ward boy by checking multiple property IDs
export function useWardBoyProperties(address: `0x${string}` | undefined, maxProperties: number = 50) {
  const [assignedProperties, setAssignedProperties] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!address) {
      setIsLoading(false)
      return
    }

    const checkProperties = async () => {
      setIsLoading(true)
      const properties: number[] = []

      // Check property IDs from 0 to maxProperties
      for (let i = 0; i < maxProperties; i++) {
        try {
          // We'll use fetch to check each property
          // This is temporary - ideally we'd have a subgraph or backend API
          const response = await fetch('/api/check-ward-boy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: i, address })
          })
          
          if (response.ok) {
            const { isWardBoy } = await response.json()
            if (isWardBoy) {
              properties.push(i)
            }
          }
        } catch (error) {
          // Skip if property doesn't exist
          continue
        }
      }

      setAssignedProperties(properties)
      setIsLoading(false)
    }

    checkProperties()
  }, [address, maxProperties])

  return {
    properties: assignedProperties,
    isLoading
  }
}

