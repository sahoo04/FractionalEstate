import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/property/[tokenId]
 * Fetch property details from database by token ID
 */
export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    logger.info('Fetching property details', { tokenId })

    // Fetch property from database
    const { data: property, error } = await (supabaseAdmin as any)
      .from('properties')
      .select('*')
      .eq('token_id', tokenId)
      .single()

    if (error) {
      // If no rows returned, it's a 404
      if (error.code === 'PGRST116') {
        logger.warn('Property not found in database', { tokenId })
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
      logger.error('Error fetching property', { error, tokenId })
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Fetch property metadata from IPFS if available
    let metadata = null
    if (property.metadata_uri) {
      try {
        const metadataUrl = property.metadata_uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
        const metadataResponse = await fetch(metadataUrl)
        if (metadataResponse.ok) {
          metadata = await metadataResponse.json()
          logger.debug('Fetched property metadata from IPFS', { tokenId })
        }
      } catch (err) {
        logger.warn('Could not fetch property metadata', { tokenId, error: err })
      }
    }

    // Merge database data with metadata
    const propertyData = {
      ...property,
      metadata: metadata || {},
      // Use metadata images if database images are empty
      images: property.images && property.images.length > 0 
        ? property.images 
        : metadata?.images || [],
      amenities: property.amenities && property.amenities.length > 0
        ? property.amenities
        : metadata?.amenities || []
    }

    logger.info('Property details fetched successfully', { 
      tokenId,
      hasMetadata: !!metadata,
      imageCount: propertyData.images.length 
    })

    return NextResponse.json({
      success: true,
      property: propertyData
    })

  } catch (error: any) {
    logger.error('Error in property details API', { error })
    return NextResponse.json(
      { error: error.message || 'Failed to fetch property' },
      { status: 500 }
    )
  }
}
