import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/properties/list
 * Fetch all properties with optional filters
 * Query params: ?owner=0x... &property_type=APARTMENT &status=ACTIVE &limit=10 &offset=0
 */
export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')?.toLowerCase()
    const propertyType = searchParams.get('property_type')
    const status = searchParams.get('status') // DRAFT, ACTIVE, SOLD, DELISTED
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabaseAdmin as any)
      .from('properties')
      .select('*', { count: 'exact' })

    // Apply filters
    if (owner) {
      query = query.eq('seller_wallet', owner)
    }
    if (propertyType) {
      query = query.eq('property_type', propertyType)
    }
    if (status) {
      query = query.eq('status', status.toUpperCase())
    }

    // Pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    logger.debug('Properties listed', { 
      count: data?.length, 
      total: count,
      filters: { owner, propertyType, status }
    })

    return NextResponse.json({
      properties: data || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error: any) {
    logger.error('Error listing properties', { error })
    return NextResponse.json(
      { error: error.message || 'Failed to list properties' },
      { status: 500 }
    )
  }
}
