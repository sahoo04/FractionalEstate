import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * POST /api/marketplace/create
 * Create a new marketplace listing after blockchain transaction
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      listingId,
      sellerWallet,
      tokenId,
      propertyName,
      sharesAmount,
      pricePerShare,
      totalPrice
    } = body

    // Validate required fields
    if (!listingId || !sellerWallet || !tokenId || !sharesAmount || !pricePerShare) {
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

    logger.info('Creating marketplace listing', {
      listingId,
      sellerWallet,
      tokenId,
      sharesAmount
    })

    // Insert into database
    const { data, error } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .insert({
        listing_id: listingId,
        seller_wallet: sellerWallet,
        token_id: tokenId,
        property_name: propertyName,
        shares_amount: sharesAmount,
        price_per_share: pricePerShare,
        total_price: totalPrice,
        status: 'ACTIVE'
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating listing', { error })
      return NextResponse.json(
        { error: 'Failed to create listing' },
        { status: 500 }
      )
    }

    logger.info('Marketplace listing created successfully', { listingId })

    return NextResponse.json({
      success: true,
      listing: data
    })

  } catch (error: any) {
    logger.error('Error in create listing API', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
