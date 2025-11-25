import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * POST /api/portfolio/sync
 * Sync user's portfolio shares with blockchain data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { wallet, tokenId, shares } = body

    if (!wallet || tokenId === undefined || shares === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet, tokenId, shares' },
        { status: 400 }
      )
    }

    const normalizedWallet = wallet.toLowerCase()

    logger.info('Syncing portfolio shares', { 
      wallet: normalizedWallet, 
      tokenId, 
      shares 
    })

    // Check if portfolio entry exists
    const { data: existing } = await (supabaseAdmin as any)
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', normalizedWallet)
      .eq('token_id', tokenId)
      .single()

    if (existing) {
      // Get property price to calculate total_invested
      const { data: property } = await (supabaseAdmin as any)
        .from('properties')
        .select('price_per_share')
        .eq('token_id', tokenId)
        .single()

      const totalInvested = property 
        ? (parseFloat(property.price_per_share) * shares).toFixed(2)
        : existing.total_invested

      // Update existing entry with shares and recalculated investment
      const { error: updateError } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .update({
          shares_owned: shares,
          total_invested: totalInvested,
          last_updated: new Date().toISOString()
        })
        .eq('user_wallet', normalizedWallet)
        .eq('token_id', tokenId)

      if (updateError) {
        logger.error('Error updating portfolio', { error: updateError })
        throw updateError
      }

      logger.info('Portfolio updated successfully', { 
        wallet: normalizedWallet, 
        tokenId, 
        shares,
        totalInvested 
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Portfolio synced successfully',
        shares,
        totalInvested 
      })
    } else {
      // Portfolio entry doesn't exist - this might happen if database was cleared
      // We should create it, but we need property info
      const { data: property } = await (supabaseAdmin as any)
        .from('properties')
        .select('name, price_per_share')
        .eq('token_id', tokenId)
        .single()

      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }

      const totalInvested = (parseFloat(property.price_per_share) * shares).toFixed(2)

      const { error: insertError } = await (supabaseAdmin as any)
        .from('user_portfolios')
        .insert({
          user_wallet: normalizedWallet,
          token_id: tokenId,
          property_name: property.name,
          shares_owned: shares,
          total_invested: totalInvested,
          last_updated: new Date().toISOString()
        })

      if (insertError) {
        logger.error('Error creating portfolio entry', { error: insertError })
        throw insertError
      }

      logger.info('Portfolio entry created successfully', { 
        wallet: normalizedWallet, 
        tokenId, 
        shares 
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Portfolio entry created',
        shares 
      })
    }

  } catch (error: any) {
    logger.error('Error syncing portfolio', { error })
    return NextResponse.json(
      { error: error.message || 'Failed to sync portfolio' },
      { status: 500 }
    )
  }
}
