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
    // Try both column names in case database schema differs
    let allListings: any[] = []
    let allError: any = null
    
    try {
      const result = await (supabaseAdmin as any)
        .from('marketplace_listings')
        .select('*')
        .order('created_at', { ascending: false })
      allListings = result.data || []
      allError = result.error
    } catch (e) {
      // Try with listed_at if created_at doesn't exist
      try {
        const result = await (supabaseAdmin as any)
          .from('marketplace_listings')
          .select('*')
          .order('listed_at', { ascending: false })
        allListings = result.data || []
        allError = result.error
      } catch (e2) {
        allError = e2
      }
    }

    // Fetch only ACTIVE listings
    let activeListings: any[] = []
    let activeError: any = null
    
    try {
      const result = await (supabaseAdmin as any)
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
      activeListings = result.data || []
      activeError = result.error
    } catch (e) {
      // Try with listed_at if created_at doesn't exist
      try {
        const result = await (supabaseAdmin as any)
          .from('marketplace_listings')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('listed_at', { ascending: false })
        activeListings = result.data || []
        activeError = result.error
      } catch (e2) {
        activeError = e2
      }
    }

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
