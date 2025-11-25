import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { createPublicClient, http, decodeEventLog } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL!)
})

const sharesPurchasedAbi = [
  {
    type: 'event',
    name: 'SharesPurchased',
    inputs: [
      { name: 'tokenId', indexed: true, type: 'uint256' },
      { name: 'buyer', indexed: true, type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'totalPrice', type: 'uint256' }
    ]
  }
] as const

/**
 * POST /api/transactions/log
 * Log a transaction to database after blockchain confirmation
 */
export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      logger.warn('Transaction log attempted but Supabase not configured')
      return NextResponse.json(
        { message: 'Database not configured - transaction on blockchain only' },
        { status: 200 }
      )
    }

    const body = await request.json()
    
    const {
      transaction_hash,
      from_address,
      to_address,
      property_token_id,
      amount,
      share_quantity,
      transaction_type,
      block_number,
      gas_used,
      gas_price
    } = body

    if (!transaction_hash || !from_address || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Normalize addresses
    const normalizedFrom = from_address.toLowerCase()
    const normalizedTo = to_address?.toLowerCase()

    // Verify transaction on-chain
    try {
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: transaction_hash as `0x${string}` 
      })
      
      if (!receipt || receipt.status !== 'success') {
        return NextResponse.json(
          { error: 'Transaction not successful on blockchain' },
          { status: 400 }
        )
      }

      if (receipt.from.toLowerCase() !== normalizedFrom) {
        return NextResponse.json(
          { error: 'Transaction from address mismatch' },
          { status: 400 }
        )
      }

      if (normalizedTo && receipt.to?.toLowerCase() !== normalizedTo) {
        return NextResponse.json(
          { error: 'Transaction to address mismatch' },
          { status: 400 }
        )
      }

      // Verify SharesPurchased event
      let foundEvent = false
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: sharesPurchasedAbi,
            data: log.data,
            topics: log.topics
          })
          if (decoded.eventName === 'SharesPurchased' &&
              decoded.args.tokenId === BigInt(property_token_id) &&
              decoded.args.buyer.toLowerCase() === normalizedFrom &&
              decoded.args.amount === BigInt(share_quantity)) {
            foundEvent = true
            break
          }
        } catch (error) {
          // Ignore logs that don't match
        }
      }
      if (!foundEvent) {
        return NextResponse.json(
          { error: 'SharesPurchased event not found or parameters mismatch' },
          { status: 400 }
        )
      }
    } catch (error) {
      logger.error('Failed to verify transaction on-chain', { error, transaction_hash })
      return NextResponse.json(
        { error: 'Failed to verify transaction on blockchain' },
        { status: 500 }
      )
    }

    // Check if transaction already logged
    const { data: existing } = await (supabaseAdmin as any)
      .from('transactions')
      .select('id')
      .eq('tx_hash', transaction_hash)
      .maybeSingle()

    if (existing) {
      logger.debug('Transaction already logged', { transaction_hash })
      return NextResponse.json({ 
        success: true,
        message: 'Transaction already exists',
        transaction: existing 
      })
    }

    // Insert transaction - using correct schema column names
    const { data, error } = await (supabaseAdmin as any)
      .from('transactions')
      .insert([{
        tx_hash: transaction_hash,
        type: 'PURCHASE', // Must match enum: MINT, TRANSFER, PURCHASE, RENT_DEPOSIT, CLAIM
        from_wallet: normalizedFrom,
        to_wallet: normalizedTo || normalizedFrom,
        token_id: property_token_id ? parseInt(property_token_id) : 0,
        amount: share_quantity ? parseInt(share_quantity.toString()) : 0, // Number of shares
        price: amount ? parseFloat(amount) / 1e6 : 0, // Price in USDC (convert from wei)
        timestamp: new Date().toISOString(),
        block_number: block_number ? Number(block_number) : 0,
        status: 'SUCCESS' // Must match enum: PENDING, SUCCESS, FAILED
      }])
      .select()
      .single()

    if (error) {
      logger.error('Failed to log transaction', { error, transaction_hash })
      throw error
    }

    logger.info('Transaction logged', { 
      transaction_hash,
      type: 'PURCHASE',
      from: normalizedFrom 
    })

    // Update user portfolio if property purchase
    if ((transaction_type === 'SHARE_PURCHASE' || transaction_type === 'PURCHASE') && property_token_id && share_quantity) {
      await updateUserPortfolio(
        normalizedFrom,
        property_token_id,
        share_quantity
      )
    }

    return NextResponse.json({ 
      success: true,
      transaction: data 
    })

  } catch (error: any) {
    logger.error('Error in transaction log API', { error })
    return NextResponse.json(
      { error: error.message || 'Failed to log transaction' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Update user portfolio after share purchase
 */
async function updateUserPortfolio(
  userAddress: string,
  tokenId: string,
  shareQuantity: number
) {
  try {
    if (!supabaseAdmin) return
    logger.info('updateUserPortfolio called', { userAddress, tokenId, shareQuantity })
    // Check if user already has this property in portfolio
    const { data: existing } = await (supabaseAdmin as any)
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', userAddress)
      .eq('token_id', tokenId)
      .single()

    // Get property details
    const { data: property } = await (supabaseAdmin as any)
      .from('properties')
      .select('price_per_share, name')
      .eq('token_id', tokenId)
      .single()

    const pricePerShare = parseFloat(property?.price_per_share || '0')
    const purchaseAmount = pricePerShare * shareQuantity

    // Prevent double-counting: only update if shareQuantity > 0 and not already included
    if (existing) {
      logger.info('Existing portfolio before update', { existing })
      // Only update if this transaction is new (could add more checks if needed)
      await (supabaseAdmin as any)
        .from('user_portfolios')
        .update({
          shares_owned: Number(existing.shares_owned) + Number(shareQuantity),
          total_invested: (parseFloat(existing.total_invested) + purchaseAmount).toString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id)
      logger.info('Portfolio updated', { userAddress, tokenId, newShares: shareQuantity, newTotal: Number(existing.shares_owned) + Number(shareQuantity) })
    } else {
      await (supabaseAdmin as any)
        .from('user_portfolios')
        .insert([{
          user_wallet: userAddress,
          token_id: tokenId,
          property_name: property?.name || `Property #${tokenId}`,
          shares_owned: shareQuantity,
          total_invested: purchaseAmount.toString()
        }])
      logger.info('Portfolio entry created', { userAddress, tokenId, shares: shareQuantity })
    }
  } catch (error) {
    logger.error('Error updating portfolio', { error, userAddress, tokenId, shareQuantity })
  }
}
