import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/properties/[tokenId]
 * Fetch property details by token ID
 */
export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { tokenId } = params

    const { data, error } = await (supabaseAdmin as any)
      .from('properties')
      .select('*')
      .eq('token_id', tokenId)
      .single()

    if (error) {
      // PGRST116 means no rows returned
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { exists: false },
          { status: 404 }
        )
      }
      throw error
    }

    logger.debug('Property fetched', { tokenId })

    return NextResponse.json({
      exists: true,
      property: data
    })

  } catch (error: any) {
    logger.error('Error fetching property', { error, tokenId: params.tokenId })
    return NextResponse.json(
      { error: error.message || 'Failed to fetch property' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/properties/[tokenId]
 * Update property (e.g., reduce available shares after purchase)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { tokenId } = params
    const body = await request.json()

    const { data, error } = await (supabaseAdmin as any)
      .from('properties')
      .update(body)
      .eq('token_id', tokenId)
      .select()
      .single()

    if (error) {
      throw error
    }

    logger.info('Property updated', { tokenId, updates: Object.keys(body) })

    return NextResponse.json({
      success: true,
      property: data
    })

  } catch (error: any) {
    logger.error('Error updating property', { error, tokenId: params.tokenId })
    return NextResponse.json(
      { error: error.message || 'Failed to update property' },
      { status: 500 }
    )
  }
}
