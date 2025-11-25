import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Approve KYC
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, adminAddress } = body
    
    if (!address || !adminAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Update KYC document status
    const { error: kycError } = await (supabase as any)
      .from('kyc_documents')
      .update({
        status: 'APPROVED',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminAddress
      })
      .eq('user_wallet', address.toLowerCase())

    if (kycError) {
      console.error('Error updating KYC:', kycError)
      return NextResponse.json(
        { error: 'Failed to update KYC document' },
        { status: 500 }
      )
    }

    // Update user's kyc_status
    const { error: userError } = await (supabase as any)
      .from('users')
      .update({ kyc_status: 'APPROVED' })
      .eq('wallet_address', address.toLowerCase())

    if (userError) {
      console.error('Error updating user KYC status:', userError)
    }
    
    console.log('KYC approved:', { address, adminAddress, approvedAt: new Date().toISOString() })

    return NextResponse.json({
      success: true,
      message: 'KYC approved successfully',
      address,
      status: 'APPROVED'
    })
  } catch (error) {
    console.error('KYC approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve KYC', details: (error as Error).message },
      { status: 500 }
    )
  }
}
