import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not configured' 
      }, { status: 503 })
    }

    const wallet = params.wallet.toLowerCase()

    const { data, error } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return NextResponse.json({ 
          exists: false,
          message: 'User not registered' 
        }, { status: 404 })
      }
      
      logger.error('Error fetching user', error, { wallet })
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      exists: true,
      user: data 
    })
  } catch (error: any) {
    logger.error('Error in user fetch API', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
