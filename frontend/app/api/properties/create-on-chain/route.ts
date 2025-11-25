import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'

// Lazy initialization to avoid build-time errors when env vars are missing
function getAccount() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('RELAYER_PRIVATE_KEY environment variable is not set')
  }
  return privateKeyToAccount(privateKey as `0x${string}`)
}

function getPublicClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_ARBITRUM_RPC_URL environment variable is not set')
  }
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl)
  })
}

function getWalletClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_ARBITRUM_RPC_URL environment variable is not set')
  }
  return createWalletClient({
    account: getAccount(),
    chain: arbitrumSepolia,
    transport: http(rpcUrl)
  })
}

export async function POST(req: NextRequest) {
  try {
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
    const walletClient = getWalletClient()
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
    const publicClient = getPublicClient()
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
