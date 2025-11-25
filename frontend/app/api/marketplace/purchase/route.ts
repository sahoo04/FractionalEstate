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

    // Ensure sharesAmount is a proper number
    const sharesAmountNum = typeof sharesAmount === 'string' 
      ? parseInt(sharesAmount, 10) 
      : Number(sharesAmount)
    
    if (isNaN(sharesAmountNum) || sharesAmountNum <= 0) {
      logger.error('Invalid sharesAmount', { sharesAmount, sharesAmountNum })
      return NextResponse.json(
        { error: 'Invalid shares amount' },
        { status: 400 }
      )
    }

    logger.info('Processing marketplace purchase', {
      listingId,
      buyerWallet,
      tokenId,
      sharesAmount: sharesAmountNum,
      originalSharesAmount: sharesAmount
    })

    // Get current listing to check if this is a partial purchase
    const { data: currentListing } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .select('shares_amount, status, price_per_share')
      .eq('listing_id', listingId)
      .single()

    if (!currentListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Ensure proper type conversion for current shares
    const currentShares = typeof currentListing.shares_amount === 'string' 
      ? parseInt(currentListing.shares_amount, 10) 
      : Number(currentListing.shares_amount)
    
    if (isNaN(currentShares) || currentShares < 0) {
      logger.error('Invalid current shares_amount in listing', { 
        currentListing: currentListing.shares_amount, 
        currentShares, 
        listingId 
      })
      return NextResponse.json(
        { error: 'Invalid listing shares amount' },
        { status: 400 }
      )
    }

    if (sharesAmountNum > currentShares) {
      logger.error('Purchase amount exceeds available shares', {
        sharesAmountNum,
        currentShares,
        listingId
      })
      return NextResponse.json(
        { error: 'Purchase amount exceeds available shares' },
        { status: 400 }
      )
    }

    const remainingShares = currentShares - sharesAmountNum
    const isFullPurchase = remainingShares === 0
    const pricePerShare = parseFloat(currentListing.price_per_share) || 0
    const updatedTotalPrice = remainingShares * pricePerShare

    logger.info('Calculating remaining shares', {
      listingId,
      currentShares,
      sharesAmountNum,
      remainingShares,
      isFullPurchase
    })

    // Update listing: reduce shares_amount, recalculate total_price, mark as SOLD if all shares purchased
    const { error: updateError } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .update({
        shares_amount: remainingShares,
        total_price: updatedTotalPrice.toString(),
        status: isFullPurchase ? 'SOLD' : 'ACTIVE',
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listingId)

    if (updateError) {
      logger.error('Error updating listing', { error: updateError, listingId })
      // Don't fail the request, just log the error
    } else {
      logger.info('Listing updated', { 
        listingId, 
        remainingShares, 
        isFullPurchase 
      })
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
      // Ensure proper type conversion
      const currentBuyerShares = typeof existingPortfolio.shares_owned === 'string' 
        ? parseInt(existingPortfolio.shares_owned, 10) 
        : Number(existingPortfolio.shares_owned)
      
      // Ensure total_invested is properly converted
      const currentTotalInvested = typeof existingPortfolio.total_invested === 'string'
        ? parseFloat(existingPortfolio.total_invested)
        : Number(existingPortfolio.total_invested) || 0
      
      // Ensure totalPrice is properly converted
      const purchasePrice = typeof totalPrice === 'string'
        ? parseFloat(totalPrice)
        : Number(totalPrice) || 0
      
      const newShares = currentBuyerShares + sharesAmountNum
      const newTotalInvested = currentTotalInvested + purchasePrice

      logger.info('Updating buyer portfolio', {
        buyerWallet,
        tokenId,
        currentShares: currentBuyerShares,
        sharesToAdd: sharesAmountNum,
        newShares,
        currentTotalInvested,
        purchasePrice,
        newTotalInvested,
        originalTotalPrice: totalPrice,
        originalTotalInvested: existingPortfolio.total_invested
      })

      // Validate calculated values
      if (isNaN(newShares) || newShares < 0) {
        logger.error('Invalid newShares calculated', { newShares, currentBuyerShares, sharesAmountNum })
        return NextResponse.json(
          { error: 'Invalid shares calculation' },
          { status: 500 }
        )
      }

      if (isNaN(newTotalInvested) || newTotalInvested < 0) {
        logger.error('Invalid newTotalInvested calculated', { 
          newTotalInvested, 
          currentTotalInvested, 
          purchasePrice 
        })
        return NextResponse.json(
          { error: 'Invalid investment calculation' },
          { status: 500 }
        )
      }

      const { error: portfolioError } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .update({
          shares_owned: newShares,
          total_invested: newTotalInvested.toFixed(2), // Use toFixed to ensure proper decimal format
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
      // Ensure totalPrice is properly converted
      const purchasePrice = typeof totalPrice === 'string'
        ? parseFloat(totalPrice)
        : Number(totalPrice) || 0
      
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        logger.error('Invalid purchasePrice for new portfolio', { totalPrice, purchasePrice })
        return NextResponse.json(
          { error: 'Invalid purchase price' },
          { status: 400 }
        )
      }

      const { error: portfolioError } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .insert({
          user_wallet: buyerWallet.toLowerCase(),
          token_id: tokenId,
          property_name: property?.name || `Property #${tokenId}`,
          shares_owned: sharesAmountNum,
          total_invested: purchasePrice.toFixed(2), // Use toFixed to ensure proper decimal format
          total_rewards_claimed: '0',
          last_updated: new Date().toISOString()
        })

      if (portfolioError) {
        logger.error('Error creating portfolio entry', { error: portfolioError, buyerWallet, tokenId })
      } else {
        logger.info('New portfolio entry created', { buyerWallet, tokenId, sharesAmount: sharesAmountNum })
      }
    }

    // IMPORTANT: DO NOT update seller's portfolio here!
    // When a listing is created, the shares are transferred from seller to marketplace (escrow).
    // The indexer's TransferSingle event handler already subtracts those shares from the seller's portfolio.
    // When the purchase happens, the shares are transferred from marketplace to buyer.
    // The indexer's TransferSingle event handler adds those shares to the buyer's portfolio.
    // The seller's portfolio was already updated when the listing was created, so we should NOT subtract again here.
    // 
    // If we subtract here, we'd be doing DOUBLE SUBTRACTION:
    // 1. When listing created: seller -> marketplace (indexer subtracts from seller) ✅
    // 2. When purchase happens: marketplace -> buyer (indexer adds to buyer) ✅
    // 3. If we subtract here: we'd subtract again from seller ❌ (WRONG!)
    //
    // The seller's portfolio is managed by the indexer via TransferSingle events.
    // This API route should only update the buyer's portfolio and marketplace listing status.
    
    if (sellerWallet) {
      logger.info('Seller portfolio update skipped - handled by indexer TransferSingle events', {
        sellerWallet,
        tokenId,
        soldShares: sharesAmountNum,
        note: 'Seller shares were already subtracted when listing was created'
      })
    }

    // Create marketplace transaction record (optional - for history)
    const { error: txError } = await (supabaseAdmin as any)
      .from('marketplace_transactions')
      .insert({
        listing_id: listingId,
        buyer_wallet: buyerWallet.toLowerCase(),
        seller_wallet: sellerWallet?.toLowerCase(),
        token_id: tokenId,
        shares_amount: sharesAmountNum,
        price_per_share: (parseFloat(totalPrice) / sharesAmountNum).toString(),
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
