import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

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

    // Check if transaction already logged
    const { data: existing } = await (supabaseAdmin as any)
      .from('transactions')
      .select('id')
      .eq('tx_hash', transaction_hash)
      .single()

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

    if (existing) {
      // Update existing entry
      await (supabaseAdmin as any)
        .from('user_portfolios')
        .update({
          shares_owned: existing.shares_owned + shareQuantity,
          total_invested: (parseFloat(existing.total_invested) + purchaseAmount).toString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id)

      logger.info('Portfolio updated', { userAddress, tokenId, newShares: shareQuantity })
    } else {
      // Create new portfolio entry
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
    logger.error('Error updating portfolio', { error, userAddress, tokenId })
  }
}
