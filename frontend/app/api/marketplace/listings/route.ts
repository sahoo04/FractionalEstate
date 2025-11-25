import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/marketplace/listings
 * Fetch active marketplace listings from database
 */
export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    logger.info('Fetching marketplace listings')

    // Fetch active listings
    const { data: listings, error: listingsError } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    if (listingsError) {
      logger.error('Error fetching listings', { error: listingsError })
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      )
    }

    logger.info('Fetched listings from database', { count: listings?.length || 0, listings })

    if (!listings || listings.length === 0) {
      logger.info('No active listings found in database')
      return NextResponse.json({
        success: true,
        listings: [],
        count: 0
      })
    }

    // Get unique token IDs
    const tokenIds = [...new Set(listings.map((l: any) => l.token_id))]
    
    logger.info('Fetching properties for token IDs', { tokenIds })
    
    // Fetch property details for all token IDs
    const { data: properties, error: propertiesError } = await (supabaseAdmin as any)
      .from('properties')
      .select('token_id, name, location, images, property_type, status')
      .in('token_id', tokenIds)

    if (propertiesError) {
      logger.error('Error fetching properties', { error: propertiesError })
    }

    logger.info('Fetched properties', { count: properties?.length || 0, properties })

    // Create a map of properties by token_id
    const propertiesMap = new Map()
    if (properties) {
      properties.forEach((prop: any) => {
        propertiesMap.set(prop.token_id, prop)
      })
    }

    // Combine listings with property data
    const formattedListings = listings
      .map((listing: any) => {
        const property = propertiesMap.get(listing.token_id)
        
        // Only include listings where property is ACTIVE
        if (!property || property.status !== 'ACTIVE') {
          return null
        }

        return {
          id: listing.id,
          listingId: listing.listing_id,
          sellerWallet: listing.seller_wallet,
          tokenId: listing.token_id,
          propertyName: listing.property_name,
          sharesAmount: listing.shares_amount,
          pricePerShare: listing.price_per_share,
          totalPrice: listing.total_price,
          status: listing.status,
          createdAt: listing.created_at,
          property: {
            name: property.name,
            location: property.location,
            images: property.images,
            propertyType: property.property_type
          }
        }
      })
      .filter((listing: any) => listing !== null)

    logger.info('Marketplace listings fetched', { count: formattedListings.length })

    return NextResponse.json({
      success: true,
      listings: formattedListings,
      count: formattedListings.length
    })

  } catch (error: any) {
    logger.error('Error in marketplace listings API', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
