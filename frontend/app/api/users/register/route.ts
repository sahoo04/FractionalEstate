import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      logger.warn('Supabase not configured, skipping database save')
      return NextResponse.json({ 
        success: true, 
        message: 'User registered on blockchain (database disabled)' 
      })
    }

    const body = await request.json()
    const { walletAddress, role, name, email, businessName } = body

    // Validate required fields
    if (!walletAddress || !role || !name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already registered' },
        { status: 409 }
      )
    }

    // Insert new user
    const { data, error } = await (supabaseAdmin as any)
      .from('users')
      .insert([{
        wallet_address: walletAddress.toLowerCase(),
        role: role as 'CLIENT' | 'SELLER',
        kyc_status: 'NONE',
        name: name,
        email: email,
        business_name: businessName || null,
      }])
      .select()
      .single()

    if (error) {
      logger.error('Error inserting user', error, { walletAddress })
      return NextResponse.json(
        { error: 'Failed to register user' },
        { status: 500 }
      )
    }

    logger.info('User registered in database', { 
      walletAddress: walletAddress,
      role: role 
    })

    return NextResponse.json(data)
  } catch (error: any) {
    logger.error('Error in user registration API', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
