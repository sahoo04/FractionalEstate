import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/debug/marketplace
 * Debug endpoint to see raw marketplace listings data
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Fetch ALL marketplace listings (not just ACTIVE)
    const { data: allListings, error: allError } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch only ACTIVE listings
    const { data: activeListings, error: activeError } = await (supabaseAdmin as any)
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    return NextResponse.json({ 
      success: true,
      allListings: {
        count: allListings?.length || 0,
        data: allListings || []
      },
      activeListings: {
        count: activeListings?.length || 0,
        data: activeListings || []
      },
      errors: {
        all: allError,
        active: activeError
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
