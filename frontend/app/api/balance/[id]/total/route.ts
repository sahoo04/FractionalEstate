import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc'),
})

const PROPERTY_SHARE_1155_ABI = [
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenId = params.id

    const contractAddress = process.env.NEXT_PUBLIC_PROPERTY_TOKEN_ADDRESS as `0x${string}`
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 })
    }

    const totalSupply = await publicClient.readContract({
      address: contractAddress,
      abi: PROPERTY_SHARE_1155_ABI,
      functionName: 'totalSupply',
      args: [BigInt(tokenId)],
    })

    return NextResponse.json(totalSupply.toString())
  } catch (error) {
    console.error('Error fetching total supply:', error)
    return NextResponse.json(0)
  }
}
