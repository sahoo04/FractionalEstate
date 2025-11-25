import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * POST /api/marketplace/cancel
 * Update marketplace listing status to CANCELLED after blockchain cancellation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listingId } = body

    // Validate required fields
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

    logger.info('Updating listing status to CANCELLED', { listingId })

    // Update listing status to CANCELLED
    const { data, error } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listingId)
      .select()
      .single()

    if (error) {
      logger.error('Error cancelling listing', { error, listingId })
      return NextResponse.json(
        { error: 'Failed to cancel listing' },
        { status: 500 }
      )
    }

    logger.info('Listing cancelled successfully', { listingId })

    return NextResponse.json({
      success: true,
      listing: data
    })
  } catch (error: any) {
    logger.error('Error in cancel listing API', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
