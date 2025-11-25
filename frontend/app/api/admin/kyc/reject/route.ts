import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Reject KYC
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, reason, adminAddress } = body
    
    if (!address || !reason || !adminAddress) {
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
        status: 'REJECTED',
        rejection_reason: reason,
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
      .update({ kyc_status: 'REJECTED' })
      .eq('wallet_address', address.toLowerCase())

    if (userError) {
      console.error('Error updating user KYC status:', userError)
    }
    
    console.log('KYC rejected:', { address, reason, adminAddress, rejectedAt: new Date().toISOString() })

    return NextResponse.json({
      success: true,
      message: 'KYC rejected',
      address,
      status: 'REJECTED',
      reason
    })
  } catch (error) {
    console.error('KYC rejection error:', error)
    return NextResponse.json(
      { error: 'Failed to reject KYC', details: (error as Error).message },
      { status: 500 }
    )
  }
}
