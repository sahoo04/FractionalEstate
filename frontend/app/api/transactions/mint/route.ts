import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { CONTRACTS, PROPERTY_SHARE_1155_ABI } from '@/lib/contracts'
import { logger } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/transactions/mint
 * Mint property shares via relayer (gasless for user)
 * Body: { to: address, tokenId: number, amount: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, tokenId, amount } = body

    if (!to || !tokenId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: to, tokenId, amount' },
        { status: 400 }
      )
    }

    logger.info('Minting shares via relayer', { to, tokenId, amount })

    // Get relayer private key from env
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY
    if (!relayerPrivateKey) {
      logger.error('Relayer private key not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create relayer account and wallet client
    const account = privateKeyToAccount(relayerPrivateKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    })

    logger.info('Relayer account', { address: account.address })

    // Get property details from database
    const { data: property, error: dbError } = await (supabaseAdmin as any)
      .from('properties')
      .select('*')
      .eq('token_id', tokenId)
      .single()

    if (dbError || !property) {
      logger.error('Property not found in database', { tokenId, error: dbError })
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check if property is ACTIVE
    if (property.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Property is not active for purchase' },
        { status: 400 }
      )
    }

    // Call mintShares on contract
    // Function signature: mintShares(address to, uint256 tokenId, uint256 amount)
    const hash = await walletClient.writeContract({
      address: CONTRACTS.PropertyShare1155,
      abi: PROPERTY_SHARE_1155_ABI,
      functionName: 'mintShares',
      args: [to as `0x${string}`, BigInt(tokenId), BigInt(amount)],
    })

    logger.info('Mint transaction sent', { hash, to, tokenId, amount })

    // Update minted_shares in database
    const newMintedShares = (property.minted_shares || 0) + amount
    const { error: updateError } = await (supabaseAdmin as any)
      .from('properties')
      .update({ 
        minted_shares: newMintedShares,
        updated_at: new Date().toISOString()
      })
      .eq('token_id', tokenId)

    if (updateError) {
      logger.error('Failed to update minted_shares', { error: updateError })
    }

    // Record transaction in database
    try {
      await (supabaseAdmin as any)
        .from('transactions')
        .insert({
          tx_hash: hash,
          type: 'MINT',
          from_wallet: account.address.toLowerCase(),
          to_wallet: to.toLowerCase(),
          token_id: tokenId,
          amount: amount,
          price: property.price_per_share,
          timestamp: new Date().toISOString(),
          block_number: 0, // Will be updated by indexer
          status: 'PENDING',
        })
    } catch (txError) {
      logger.error('Failed to record transaction', { error: txError })
    }

    return NextResponse.json({
      success: true,
      txHash: hash,
      to,
      tokenId,
      amount,
      message: 'Shares minted successfully',
    })
  } catch (error: any) {
    logger.error('Error minting shares', error)
    return NextResponse.json(
      { error: error.message || 'Failed to mint shares' },
      { status: 500 }
    )
  }
}
