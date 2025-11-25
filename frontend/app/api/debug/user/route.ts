import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Debug endpoint to check user status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const normalizedWallet = wallet.toLowerCase()

    // Check in database - get all matches (not just single)
    const { data, error } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedWallet)

    if (error) {
      return NextResponse.json({
        found: false,
        wallet: normalizedWallet,
        error: error.message,
        hint: 'Database query error'
      })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        found: false,
        wallet: normalizedWallet,
        hint: 'User not found. Please register first.',
        allUsers: 'Run query: SELECT wallet_address, role FROM users LIMIT 10'
      })
    }

    return NextResponse.json({
      found: true,
      wallet: normalizedWallet,
      count: data.length,
      users: data.map((u: any) => ({
        wallet_address: u.wallet_address,
        role: u.role,
        kyc_status: u.kyc_status,
        name: u.name,
        email: u.email,
        created_at: u.created_at
      }))
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
