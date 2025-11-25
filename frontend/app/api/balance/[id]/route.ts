import { NextRequest, NextResponse } from 'next/server'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { createPublicClient, http, getAddress, isAddress } from 'viem'
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
    const tokenId = BigInt(params.id)
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      logger.warn('Missing address parameter', { tokenId: params.id })
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    // Validate and checksum address
    if (!isAddress(address)) {
      logger.error('Invalid address format', undefined, { address, tokenId: params.id })
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      )
    }

    const checksummedAddress = getAddress(address) as `0x${string}`

    // Read balance from contract
    const balance = await publicClient.readContract({
      address: CONTRACTS.PropertyShare1155,
      abi: PROPERTY_SHARE_1155_ABI,
      functionName: 'balanceOf',
      args: [checksummedAddress, tokenId],
    }) as bigint

    return NextResponse.json(balance.toString())
  } catch (error) {
    logger.error('Error fetching balance', error, { 
      tokenId: params.id, 
      address: request.nextUrl.searchParams.get('address') 
    })
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}

