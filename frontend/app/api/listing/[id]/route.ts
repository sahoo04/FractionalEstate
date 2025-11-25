import { NextRequest, NextResponse } from 'next/server'
import { CONTRACTS, MARKETPLACE_ABI } from '@/lib/contracts'
import { createPublicClient, http, getAddress } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import { logger } from '@/lib/logger'

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = BigInt(params.id)

    // Read listing data from contract
    const listing = await publicClient.readContract({
      address: CONTRACTS.Marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'getListing',
      args: [listingId],
    }) as {
      seller: `0x${string}`
      tokenId: bigint
      amount: bigint
      pricePerShare: bigint
      active: boolean
    }

    // Checksum seller address
    const checksummedSeller = getAddress(listing.seller) as `0x${string}`

    return NextResponse.json({
      seller: checksummedSeller,
      tokenId: listing.tokenId.toString(),
      amount: listing.amount.toString(),
      pricePerShare: listing.pricePerShare.toString(),
      active: listing.active,
    })
  } catch (error) {
    logger.error('Error fetching listing', error, { listingId: params.id })
    return NextResponse.json(
      { error: 'Failed to fetch listing data' },
      { status: 500 }
    )
  }
}

