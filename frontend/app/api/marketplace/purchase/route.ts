import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * POST /api/marketplace/purchase
 * Update marketplace listing status to SOLD after successful purchase
 * and update buyer's portfolio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      listingId,
      buyerWallet,
      sellerWallet,
      tokenId,
      sharesAmount,
      totalPrice,
      transactionHash
    } = body

    // Validate required fields
    if (!listingId || !buyerWallet || !tokenId || !sharesAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    logger.info('Processing marketplace purchase', {
      listingId,
      buyerWallet,
      tokenId,
      sharesAmount
    })

    // Update listing status to SOLD
    const { error: updateError } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .update({
        status: 'SOLD',
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listingId)

    if (updateError) {
      logger.error('Error updating listing status', { error: updateError, listingId })
      // Don't fail the request, just log the error
    }

    // Get property details
    const { data: property } = await (supabaseAdmin as any)
      .from('properties')
      .select('name, price_per_share')
      .eq('token_id', tokenId)
      .single()

    // Check if buyer already has a portfolio entry for this property
    const { data: existingPortfolio } = await (supabaseAdmin as any)
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', buyerWallet.toLowerCase())
      .eq('token_id', tokenId)
      .single()

    if (existingPortfolio) {
      // Update existing portfolio entry
      const newShares = existingPortfolio.shares_owned + sharesAmount
      const additionalInvestment = parseFloat(totalPrice) || 0
      const newTotalInvested = parseFloat(existingPortfolio.total_invested) + additionalInvestment

      const { error: portfolioError } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .update({
          shares_owned: newShares,
          total_invested: newTotalInvested.toString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', existingPortfolio.id)

      if (portfolioError) {
        logger.error('Error updating portfolio', { error: portfolioError, buyerWallet, tokenId })
      } else {
        logger.info('Portfolio updated for existing holding', { buyerWallet, tokenId, newShares })
      }
    } else {
      // Create new portfolio entry
      const { error: portfolioError } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .insert({
          user_wallet: buyerWallet.toLowerCase(),
          token_id: tokenId,
          property_name: property?.name || `Property #${tokenId}`,
          shares_owned: sharesAmount,
          total_invested: totalPrice.toString(),
          total_rewards_claimed: '0',
          last_updated: new Date().toISOString()
        })

      if (portfolioError) {
        logger.error('Error creating portfolio entry', { error: portfolioError, buyerWallet, tokenId })
      } else {
        logger.info('New portfolio entry created', { buyerWallet, tokenId, sharesAmount })
      }
    }

    // Update seller's portfolio - reduce their shares
    if (sellerWallet) {
      const { data: sellerPortfolio } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .select('*')
        .eq('user_wallet', sellerWallet.toLowerCase())
        .eq('token_id', tokenId)
        .single()

      if (sellerPortfolio) {
        const newSellerShares = sellerPortfolio.shares_owned - sharesAmount

        if (newSellerShares <= 0) {
          // Seller sold all shares - delete portfolio entry
          const { error: deleteError } = await (supabaseAdmin as any)
            .from('user_portfolios')
            .delete()
            .eq('id', sellerPortfolio.id)

          if (deleteError) {
            logger.error('Error deleting seller portfolio', { error: deleteError, sellerWallet, tokenId })
          } else {
            logger.info('Seller portfolio removed (sold all shares)', { sellerWallet, tokenId })
          }
        } else {
          // Update seller's remaining shares
          const { error: sellerUpdateError } = await (supabaseAdmin as any)
            .from('user_portfolios')
            .update({
              shares_owned: newSellerShares,
              last_updated: new Date().toISOString()
            })
            .eq('id', sellerPortfolio.id)

          if (sellerUpdateError) {
            logger.error('Error updating seller portfolio', { error: sellerUpdateError, sellerWallet, tokenId })
          } else {
            logger.info('Seller portfolio updated', { sellerWallet, tokenId, remainingShares: newSellerShares })
          }
        }
      } else {
        logger.warn('Seller portfolio not found', { sellerWallet, tokenId })
      }
    }

    // Create marketplace transaction record (optional - for history)
    const { error: txError } = await (supabaseAdmin as any)
      .from('marketplace_transactions')
      .insert({
        listing_id: listingId,
        buyer_wallet: buyerWallet.toLowerCase(),
        seller_wallet: sellerWallet?.toLowerCase(),
        token_id: tokenId,
        shares_amount: sharesAmount,
        price_per_share: (parseFloat(totalPrice) / sharesAmount).toString(),
        total_price: totalPrice.toString(),
        transaction_hash: transactionHash,
        completed_at: new Date().toISOString()
      })

    if (txError) {
      logger.warn('Could not create transaction record', { error: txError })
      // Transaction table might not exist, that's okay
    }

    logger.info('Marketplace purchase processed successfully', { listingId, buyerWallet })

    return NextResponse.json({
      success: true,
      message: 'Purchase recorded successfully'
    })
  } catch (error: any) {
    logger.error('Error in purchase API', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
