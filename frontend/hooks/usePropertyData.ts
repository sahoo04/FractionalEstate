import { useReadContract } from 'wagmi'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'

export function usePropertyData(tokenId: number) {
  const { data: property, isLoading, error } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'getProperty',
    args: [BigInt(tokenId)],
  })

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: 'totalSupply',
    args: [BigInt(tokenId)],
  })

  return {
    property,
    totalSupply,
    isLoading,
    error,
  }
}


