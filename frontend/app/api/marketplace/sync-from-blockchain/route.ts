import { NextResponse } from 'next/server'
import { createPublicClient, http, getAddress } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import { CONTRACTS, MARKETPLACE_ABI } from '@/lib/contracts'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
})

/**
 * POST /api/marketplace/sync-from-blockchain
 * Sync listing data from blockchain to database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listingId } = body

    if (!listingId) {
      return NextResponse.json(
        { error: 'Missing listingId' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    logger.info('Syncing listing from blockchain', { listingId })

    // Read listing from blockchain
    const listing = await publicClient.readContract({
      address: CONTRACTS.Marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'getListing',
      args: [BigInt(listingId)],
    }) as {
      seller: `0x${string}`
      tokenId: bigint
      amount: bigint
      pricePerShare: bigint
      active: boolean
    }

    if (!listing.active) {
      return NextResponse.json(
        { error: 'Listing is not active on-chain' },
        { status: 400 }
      )
    }

    logger.info('Listing data from blockchain', {
      listingId,
      seller: listing.seller,
      tokenId: listing.tokenId.toString(),
      amount: listing.amount.toString(),
      pricePerShare: listing.pricePerShare.toString(),
    })

    // Get property info from database
    const { data: property } = await (supabaseAdmin as any)
      .from('properties')
      .select('name, location, images, property_type')
      .eq('token_id', Number(listing.tokenId))
      .single()

    const propertyName = property?.name || `Property #${listing.tokenId}`
    const pricePerShareUsdc = Number(listing.pricePerShare) / 1e6
    const totalPrice = pricePerShareUsdc * Number(listing.amount)

    const listingData = {
      listing_id: listingId,
      seller_wallet: getAddress(listing.seller).toLowerCase(),
      token_id: Number(listing.tokenId),
      property_name: propertyName,
      shares_amount: Number(listing.amount),
      price_per_share: pricePerShareUsdc.toString(),
      total_price: totalPrice.toString(),
      status: 'ACTIVE',
    }

    // Check if listing already exists
    const { data: existingListing } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .select('*')
      .eq('listing_id', listingId)
      .single()

    let result
    if (existingListing) {
      // Update existing listing
      logger.info('Updating existing listing', { listingId })
      const { data, error } = await (supabaseAdmin as any)
        .from('marketplace_listings')
        .update(listingData)
        .eq('listing_id', listingId)
        .select()
        .single()

      if (error) {
        logger.error('Error updating listing', { error })
        return NextResponse.json(
          { error: 'Failed to update listing' },
          { status: 500 }
        )
      }
      result = data
    } else {
      // Create new listing
      logger.info('Creating new listing', { listingId })
      const { data, error } = await (supabaseAdmin as any)
        .from('marketplace_listings')
        .insert(listingData)
        .select()
        .single()

      if (error) {
        logger.error('Error creating listing', { error })
        return NextResponse.json(
          { error: 'Failed to create listing' },
          { status: 500 }
        )
      }
      result = data
    }

    logger.info('Listing synced successfully', { listingId })

    return NextResponse.json({
      success: true,
      listing: result,
      source: 'blockchain'
    })

  } catch (error: any) {
    logger.error('Error syncing listing from blockchain', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

