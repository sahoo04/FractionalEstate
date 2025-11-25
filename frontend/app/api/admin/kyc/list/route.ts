import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Fetch all KYC documents
    const { data, error } = await (supabase as any)
      .from('kyc_documents')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching KYC documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch KYC documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documents: data || []
    })
  } catch (error: any) {
    console.error('KYC list error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
