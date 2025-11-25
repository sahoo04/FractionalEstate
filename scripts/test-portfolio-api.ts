import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPortfolioAPI() {
  const wallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  const normalizedWallet = wallet.toLowerCase()
  
  console.log('=== Testing Portfolio API Logic ===')
  console.log('Wallet:', wallet)
  console.log('Normalized:', normalizedWallet)
  console.log('')
  
  // Fetch portfolio first (same as API)
  const { data: portfolioData, error: portfolioError } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_wallet', normalizedWallet)
    .order('last_updated', { ascending: false })

  if (portfolioError) {
    console.error('❌ Error fetching portfolio:', portfolioError)
    return
  }

  console.log('Portfolio Data:', portfolioData)
  console.log('Portfolio Length:', portfolioData?.length || 0)
  console.log('')

  if (!portfolioData || portfolioData.length === 0) {
    console.log('❌ No portfolio data found')
    return
  }

  // Fetch property details (same as API)
  const tokenIds = portfolioData.map((p: any) => p.token_id)
  console.log('Token IDs:', tokenIds)
  console.log('')

  const { data: propertiesData, error: propertiesError } = await supabase
    .from('properties')
    .select('*')
    .in('token_id', tokenIds)

  if (propertiesError) {
    console.error('⚠️  Error fetching properties:', propertiesError)
  }

  console.log('Properties Data:', propertiesData)
  console.log('')

  // Merge portfolio with property details (same as API)
  const portfolio = portfolioData.map((p: any) => {
    const property = propertiesData?.find((prop: any) => prop.token_id === p.token_id)
    // price_per_share in database is already in USDC (e.g., 751 means $751)
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

  console.log('=== Final Portfolio Response ===')
  console.log(JSON.stringify({
    portfolio: portfolio,
    summary: {
      total_properties: portfolio.length,
      total_invested: portfolioData.reduce((sum: number, item: any) => sum + parseFloat(item.total_invested || '0'), 0).toFixed(2),
      current_value: portfolio.reduce((sum: number, item: any) => sum + parseFloat(item.current_value || '0'), 0).toFixed(2)
    }
  }, null, 2))
}

testPortfolioAPI()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
