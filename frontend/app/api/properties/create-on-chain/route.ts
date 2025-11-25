import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'

export const dynamic = 'force-dynamic'

function getClients() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    throw new Error('RELAYER_PRIVATE_KEY not configured')
  }

  const account = privateKeyToAccount(privateKey)

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL)
  })

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL)
  })

  return { publicClient, walletClient }
}

export async function POST(req: NextRequest) {
  try {
    const { publicClient, walletClient } = getClients()
    const body = await req.json()
    const { 
      name, 
      location, 
      totalShares, 
      pricePerShare, 
      metadataUri, 
      sellerAddress 
    } = body

    if (!name || !location || !totalShares || !pricePerShare || !sellerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Call createProperty as contract owner (relayer)
    const hash = await walletClient.writeContract({
      address: CONTRACTS.PropertyShare1155,
      abi: PROPERTY_SHARE_1155_ABI,
      functionName: 'createProperty',
      args: [
        name,
        location,
        BigInt(totalShares),
        BigInt(pricePerShare), // Already in USDC format (6 decimals)
        metadataUri || 'ipfs://default',
        sellerAddress as `0x${string}`,
        BigInt(0) // No initial mint
      ]
    })

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      receipt
    })
  } catch (error: any) {
    console.error('Create property on-chain error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create property on blockchain',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
