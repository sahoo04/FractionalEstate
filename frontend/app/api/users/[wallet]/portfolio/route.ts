import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/users/[wallet]/portfolio
 * Fetch user's property portfolio with details
 */
export async function GET(
  request: Request,
  { params }: { params: { wallet: string } }
) {
  try {
    const { wallet } = params
    const normalizedWallet = wallet?.toLowerCase() || ''

    // Test query to verify supabase is working
    const testQuery = await (supabaseAdmin as any)
      .from('user_portfolios')
      .select('user_wallet')
      .limit(5)
    
    console.log('=== PORTFOLIO API DEBUG ===')
    console.log('1. Wallet from params:', wallet)
    console.log('2. Normalized wallet:', normalizedWallet)
    console.log('3. Supabase test query (all wallets):', testQuery.data?.map((r: any) => r.user_wallet))
    console.log('4. Supabase test error:', testQuery.error)

    // Fetch portfolio
    const { data: portfolioData, error: portfolioError } = await (supabaseAdmin as any)
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', normalizedWallet)
      .order('last_updated', { ascending: false })

    console.log('5. Portfolio query result:')
    console.log('   - Found:', portfolioData?.length || 0)
    console.log('   - Error:', portfolioError)
    console.log('   - Data:', portfolioData)
    console.log('=== END DEBUG ===\n')

    logger.info('Portfolio query result', { 
      found: portfolioData?.length || 0,
      error: portfolioError?.message 
    })

    if (portfolioError) {
      logger.error('Error fetching portfolio', { error: portfolioError, wallet: normalizedWallet })
      throw portfolioError
    }

    // If no portfolio, return empty
    if (!portfolioData || portfolioData.length === 0) {
      return NextResponse.json({
        portfolio: [],
        summary: {
          total_properties: 0,
          total_invested: '0',
          current_value: '0',
          profit_loss: '0',
          profit_loss_percentage: '0'
        }
      })
    }

    // Fetch property details separately
    const tokenIds = portfolioData.map((p: any) => p.token_id)
    const { data: propertiesData, error: propertiesError } = await (supabaseAdmin as any)
      .from('properties')
      .select('*')
      .in('token_id', tokenIds)

    if (propertiesError) {
      logger.warn('Error fetching properties', { error: propertiesError })
    }

    // Merge portfolio with property details
    const portfolio = portfolioData.map((p: any) => {
      const property = propertiesData?.find((prop: any) => prop.token_id === p.token_id)
      // price_per_share in database is already in USDC (e.g., 751 means $751)
      // Don't divide by 1e6
      const currentValue = property ? (parseFloat(property.price_per_share) * p.shares_owned).toString() : '0'
      
      return {
        token_id: p.token_id,
        shares: p.shares_owned,
        total_invested: p.total_invested,
        current_value: currentValue,
        property: {
          name: property?.name || p.property_name,
          location: property?.location,
          property_type: property?.property_type,
          total_shares: property?.total_shares,
          price_per_share: property?.price_per_share,
          images: property?.images,
          status: property?.status
        }
      }
    })

    // Calculate total investment and current value
    const totalInvested = portfolio.reduce(
      (sum: number, item: any) => sum + parseFloat(item.total_invested || '0'),
      0
    )

    const currentValue = portfolio.reduce(
      (sum: number, item: any) => sum + parseFloat(item.current_value || '0'),
      0
    )

    logger.debug('Portfolio fetched', { 
      wallet: normalizedWallet,
      properties: portfolio.length 
    })

    return NextResponse.json({
      portfolio: portfolio,
      summary: {
        total_properties: portfolio.length,
        total_invested: totalInvested.toFixed(2),
        current_value: currentValue.toFixed(2),
        profit_loss: (currentValue - totalInvested).toFixed(2),
        profit_loss_percentage: totalInvested > 0 
          ? ((currentValue - totalInvested) / totalInvested * 100).toFixed(2)
          : '0.00'
      }
    })

  } catch (error: any) {
    logger.error('Error fetching portfolio', { error, wallet: 'request-failed' })
    return NextResponse.json(
      { error: error.message || 'Failed to fetch portfolio' },
      { status: 500 }
    )
  }
}
